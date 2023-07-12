import { Injectable } from '@nestjs/common';
import { currentMonth } from '@test/examples/common';
import { pseudoRandomBytes, randomUUID } from 'crypto';
import { appRecipientKey } from '../constants/app-recipient-key';
import { Asaas } from './asaas.types';

class InvalidAction extends Error {
  response = { data: { errors: [{ code: 'invalid_action' }] } };
}

@Injectable()
export class FakeAsaasService {
  private readonly SubMethods = class {
    constructor(protected readonly s: FakeAsaasService) {}
  };

  async tokenizeCard(params: Asaas.TokenizeCard): Promise<Asaas.TokenizedCard> {
    return {
      creditCardToken: randomUUID(),
      creditCardBrand: 'BRAND',
      creditCardNumber: params.creditCardNumber.slice(-4),
    };
  }

  async balance() {
    return {
      totalBalance: Infinity, // this.accounts.balances.get(key ?? appRecipientKey)
    } as Asaas.Balance;
  }

  readonly payments = new (class extends this.SubMethods {
    readonly payments = [] as Asaas.PaymentObject[];
    req: any;

    async create(
      params: Asaas.CreatePayment & { payment_id?: string },
    ): Promise<Asaas.PaymentObject> {
      if (params.billingType === 'CREDIT_CARD') {
        if (!params.creditCardToken) throw new Error();
        if (params.creditCardToken === 'invalidCard') throw new InvalidAction();
      }
      const payment: Asaas.PaymentObject = {
        ...params,
        object: 'payment',
        id: params.payment_id ?? `pay_${Math.random().toString().slice(2, 14)}`,
        dataCreated: currentMonth.toISOString().slice(0, 10),
        netValue: params.value,
        status: params.billingType === 'CREDIT_CARD' ? 'CONFIRMED' : 'PENDING',
        bankSlipUrl: 'BoletoUrl',
        deleted: false,
      };
      this.payments.push(payment);
      return payment;
    }

    async find(id: string): Promise<Asaas.PaymentObject> {
      const payment = this.payments.find((p) => p.id === id && !p.deleted);
      if (!payment) throw new Error();
      return payment;
    }

    async update(
      id: string,
      params: Asaas.CreatePayment,
    ): Promise<Asaas.PaymentObject> {
      const i = this.payments.findIndex((p) => p.id === id && !p.deleted);
      if (i < 0) throw new Error();

      return (this.payments[i] = {
        ...this.payments[i],
        ...params,
      });
    }

    async delete(id: string): Promise<Asaas.PaymentObject> {
      const i = this.payments.findIndex((p) => p.id === id && !p.deleted);
      if (i < 0) throw new Error();

      return (this.payments[i] = {
        ...this.payments[i],
        deleted: true,
      });
    }

    async refund(id: string): Promise<Asaas.PaymentObject> {
      const i = this.payments.findIndex((p) => p.id === id && !p.deleted);
      if (i < 0) throw new Error();

      return (this.payments[i] = {
        ...this.payments[i],
        status: 'REFUNDED',
      });
    }

    async findByExternalId(
      externalReference: string,
    ): Promise<Asaas.PaymentPage> {
      const list = this.payments.filter(
        (p) => p.externalReference === externalReference && !p.deleted,
      );
      return {
        object: 'list',
        hasMore: false,
        totalCount: list.length,
        limit: 0,
        offset: 0,
        data: list,
      };
    }

    async findPix(id: string): Promise<Asaas.PaymentPix> {
      const i = this.payments.findIndex((p) => p.id === id && !p.deleted);
      if (i < 0) throw new Error();

      const date = currentMonth.toISOString().slice(0, 10);

      return {
        encodedImage: pseudoRandomBytes(64).toString('base64'),
        payload:
          '00020101021226730014br.gov.bcb.pix2551pix-h.asaas.com/pixqrcode/cobv/pay_76575613967995145204000053039865802BR5905ASAAS6009Joinville61088922827162070503***63045E7A',
        expirationDate: `${date} 23:59:59`,
      };
    }

    async findBoleto(id: string): Promise<Asaas.PaymentBoleto> {
      const i = this.payments.findIndex((p) => p.id === id && !p.deleted);
      if (i < 0) throw new Error();

      return { identificationField: Math.random().toString().slice(2) };
    }
  })(this);

  readonly accounts = new (class extends this.SubMethods {
    readonly accounts = [] as Asaas.AccountObject[];
    readonly balances = new Map<string, number>();

    async create(
      params: Asaas.CreateAccount & {
        walletId?: string;
        apiKey?: string;
      },
    ): Promise<Asaas.AccountObject> {
      const { walletId, apiKey, ..._params } = params;
      const account: Asaas.AccountObject = {
        ..._params,
        walletId: walletId ?? randomUUID(),
        apiKey: apiKey ?? pseudoRandomBytes(32).toString('hex'),
      };

      this.accounts.push(account);
      this.balances.set(account.apiKey, 0);
      this.s.transfers.transfers.set(account.apiKey, []);

      return account;
    }

    async findByEmail(email: string): Promise<Asaas.AccountPage> {
      const list = this.accounts.filter((a) => a.email === email);
      return {
        object: 'list',
        hasMore: false,
        totalCount: list.length,
        limit: 0,
        offset: 0,
        data: list,
      };
    }
  })(this);

  readonly customers = new (class extends this.SubMethods {
    readonly customers = [] as Asaas.CustomerObject[];

    async create(params: Asaas.CreateCustomer) {
      const customer: Asaas.CustomerObject = {
        cpfCnpj: null,
        ...params,
        id: `cus_${Math.random().toString().slice(2, 14)}`,
        deleted: false,
      };
      this.customers.push(customer);
      return customer;
    }

    async find(id: string) {
      const customer = this.customers.find((c) => c.id === id && !c.deleted);
      if (!customer) throw new Error();
      return customer;
    }

    async findByExternalId(externalReference: string) {
      const list = this.customers.filter(
        (c) => c.externalReference === externalReference && !c.deleted,
      );
      return {
        object: 'list',
        hasMore: false,
        totalCount: list.length,
        limit: 0,
        offset: 0,
        data: list,
      };
    }

    async update(id: string, params: any) {
      const i = this.customers.findIndex((c) => c.id === id && !c.deleted);
      if (i < 0) throw new Error();

      return (this.customers[i] = {
        ...this.customers[i],
        ...params,
      });
    }

    async delete(id: string) {
      const i = this.customers.findIndex((c) => c.id === id && !c.deleted);
      if (i < 0) throw new Error();

      return (this.customers[i] = {
        ...this.customers[i],
        deleted: true,
      });
    }
  })(this);

  readonly transfers = new (class {
    readonly transfers = new Map<string, Asaas.TransferObject[]>([
      [appRecipientKey, []],
    ]);

    async create(params: Asaas.CreateTransfer, key = appRecipientKey) {
      const transfers = this.transfers.get(key);
      if (!transfers) throw new Error('Account not found');

      const date = currentMonth.toISOString().slice(0, 10);
      const transfer: Asaas.TransferObject = {
        object: 'transfer',
        id: randomUUID(),
        dateCreated: date,
        status: 'DONE',
        effectiveDate: date,
        type: params.walletId ? 'ASAAS_ACCOUNT' : 'BANK_ACCOUNT',
        value: params.value,
        netValue: params.value,
        transferFee: 0,
        scheduleDate: date,
        authorized: true,
        failReason: null,
        walletId: params.walletId,
        bankAccount: params.bankAccount && {
          ...params.bankAccount,
          bank: { ...params.bankAccount.bank, name: 'Banco' },
        },
        transactionReceiptUrl: 'string',
        operationType: params.walletId ? 'INTERNAL' : 'TED',
      };
      transfers.push(transfer);

      return transfer;
    }

    async find(inicialDate: string, finalDate: string, key = appRecipientKey) {
      const transfers = this.transfers.get(key);
      if (!transfers) throw new Error('Account not found');

      const foundTransfers = transfers.filter(
        (v) =>
          Date.parse(v.dateCreated) >= Date.parse(inicialDate) &&
          Date.parse(v.dateCreated) < Date.parse(finalDate),
      );

      return {
        object: 'list',
        hasMore: false,
        totalCount: transfers?.length,
        limit: 0,
        offset: 0,
        data: foundTransfers ?? [],
      } as Asaas.TransferPage;
    }
  })();
}
