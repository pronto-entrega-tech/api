import { OnApplicationBootstrap, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { bank_account, bank_account_type, pix_key_type } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Month } from "~/common/functions/month";
import { PaymentMethod } from "~/payments/constants/payment-methods";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { OrdersRepository } from "~/repositories/orders/orders.repository";
import { PaymentAccountsService } from "./accounts/payment-accounts.service";
import { AsaasService } from "./asaas/asaas.service";
import { Asaas } from "./asaas/asaas.types";
import { payDay } from "./constants/pay-day";
import { isTest } from "~/common/constants/is-dev";

type Market = Awaited<
  ReturnType<MarketsRepository["payouts"]["findPending"]>
>[number]["market"];

type Pix = {
  pix_key: string;
  pix_key_type: pix_key_type;
};

@Injectable()
export class PayoutsService implements OnApplicationBootstrap {
  constructor(
    private readonly asaas: AsaasService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly marketsRepo: MarketsRepository,
    private readonly ordersRepo: OrdersRepository
  ) {}
  private readonly logger = new Logger(PayoutsService.name);

  onApplicationBootstrap() {
    if (isTest) return;

    this._setup(Month.getCurrent()).catch((err) => this.logger.error(err));
    this._setup(Month.getNext()).catch((err) => this.logger.error(err));
  }

  private async _setup(month: Date) {
    if (await this.marketsRepo.payouts.exist(month)) return;

    await this.marketsRepo.payouts.createMany(month);
  }

  @Cron("0 0 25-31 * *")
  async setup(now = new Date()) {
    const nextMonth = Month.next(now);

    if (await this.marketsRepo.payouts.exist(nextMonth)) return;

    await this.marketsRepo.payouts.createMany(nextMonth);
  }

  @Cron(`0 0 ${payDay}-${payDay + 7} * *`)
  async makeMany(now = new Date()) {
    const lastMonth = Month.previous(now);

    const payouts = await this.marketsRepo.payouts.findPending(lastMonth);

    for (const { amount, market } of payouts) {
      this.makeOne(lastMonth, amount, market).catch((err) =>
        this.logger.error(err)
      );
    }
  }

  private async makeOne(
    lastMonth: Date,
    savedAmount: Prisma.Decimal,
    market: Market
  ) {
    if (!savedAmount.isPositive())
      return this.confirmPayout(market.market_id, lastMonth);

    const checkedMarket = await this.checkMarket(market);

    if (checkedMarket.hasMissingData) return;
    const { market_id, recipient_key, account } = checkedMarket;

    const payout = await this.checkPayout(market_id, recipient_key, lastMonth);

    if (payout.amountIsZero || payout.isInvalid) return;
    if (payout.isPaid)
      return this.confirmPayout(
        market_id,
        lastMonth,
        payout.amount,
        payout.transfer_id
      );
    const { amount } = payout;

    this.compareWithSavedState(amount, savedAmount, market_id);

    const transfer = await this.createTransfer(recipient_key, amount, account);

    await this.confirmPayout(market_id, lastMonth, amount, transfer.id);
  }

  private async checkMarket(market: Market) {
    const { bank_account, pix_key, pix_key_type, market_id } = market;

    const account =
      pix_key && pix_key_type ? { pix_key, pix_key_type } : bank_account;

    if (!account) {
      this.logger.error(
        `Market ${market_id} don't have pix key or bank account`
      );
      return { hasMissingData: true } as const;
    }

    const recipient_key =
      market.asaas_account_key ?? (await this.recipientKey(market_id));

    return { market_id, recipient_key, account } as const;
  }

  private async recipientKey(market_id: string) {
    const recipient = await this.paymentAccounts.createRecipient(market_id);
    return recipient.key;
  }

  private async checkPayout(
    market_id: string,
    recipient_key: string,
    lastMonth: Date
  ) {
    const currentMonth = Month.next(lastMonth);
    const transfer = await this.checkTransfers(recipient_key, currentMonth);
    if (transfer.alreadyHasTransferred)
      return {
        isPaid: true,
        transfer_id: transfer.id,
        amount: transfer.amount,
      } as const;

    const amount = await this.totalMarketAmount(market_id, lastMonth);
    if (amount <= 0) return { amountIsZero: true } as const;

    const balance = await this.checkBalance(amount, market_id, recipient_key);
    if (!balance.hasSufficientFunds) return { isInvalid: true } as const;

    return { amount } as const;
  }

  private async checkTransfers(recipient_key: string, month: Date) {
    const transfers = await this.asaas.transfers.find(
      Month.shortDate(month),
      Month.shortDate(Month.next(month)),
      recipient_key
    );

    const [transfer] = transfers.data;
    const alreadyHasTransferred = !!transfer;

    if (!alreadyHasTransferred) return { alreadyHasTransferred };

    return {
      alreadyHasTransferred,
      id: transfer.id,
      amount: +transfer.value,
    };
  }

  private async totalMarketAmount(market_id: string, lastMonth: Date) {
    const lastButOneMonth = Month.previous(lastMonth);
    const currentMonth = Month.next(lastMonth);

    const pixOrders = await this.ordersRepo.findCompleted({
      paymentMethods: [PaymentMethod.Pix],
      from: lastMonth,
      to: currentMonth,
      paid_in_app: true,
      market_id,
    });

    const cardOrders = await this.ordersRepo.findCompleted({
      paymentMethods: [PaymentMethod.Card],
      from: lastButOneMonth,
      to: lastMonth,
      paid_in_app: true,
      market_id,
    });

    const orders = [...pixOrders, ...cardOrders];
    const total = orders.reduce(
      (amount, { market_amount }) => amount.plus(market_amount),
      new Prisma.Decimal(0)
    );
    return +total;
  }

  private async checkBalance(
    amount: number,
    market_id: string,
    account_key: string
  ) {
    const { totalBalance } = await this.asaas.balance(account_key);

    const hasSufficientFunds = amount <= totalBalance;
    if (!hasSufficientFunds)
      this.logger.error(
        `Market ${market_id} have a payout amount (${amount}) greater that account balance (${totalBalance})`
      );

    return { hasSufficientFunds };
  }

  private compareWithSavedState(
    amount: number,
    savedAmount: Prisma.Decimal,
    market_id: string
  ) {
    if (amount !== +savedAmount)
      this.logger.error(
        `Market ${market_id} have a reconstructed amount (${amount}) different from saved amount (${savedAmount.toString()})`
      );
  }

  private async confirmPayout(
    market_id: string,
    lastMonth: Date,
    amount?: number,
    transfer_id?: string
  ) {
    await this.marketsRepo.payouts.update(market_id, lastMonth, {
      amount,
      is_paid: true,
      paid_at: new Date(),
      payment_id: transfer_id,
    });
  }

  private createTransfer(
    key: string,
    amount: number,
    account: bank_account | Pix
  ) {
    const params: Asaas.CreateTransfer = {
      value: amount,
      ...("pix_key" in account
        ? {
            pixAddressKey: account.pix_key,
            pixAddressKeyType: account.pix_key_type,
          }
        : {
            bankAccount: {
              bank: { code: account.bank_number },
              ownerName: account.holder_name,
              cpfCnpj: account.document,
              agency: account.agency_number,
              account: account.account_number.slice(0, -1),
              accountDigit: account.account_number.slice(-1),
              bankAccountType: this.bankAccountType[account.type],
            },
          }),
    };
    return this.asaas.transfers.create(params, key);
  }

  private readonly bankAccountType: {
    [x in bank_account_type]: Asaas.BankAccountType;
  } = {
    CHECKING: "CONTA_CORRENTE",
    SAVINGS: "CONTA_POUPANCA",
  };
}
