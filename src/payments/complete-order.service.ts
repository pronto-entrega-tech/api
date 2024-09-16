import { Injectable } from "@nestjs/common";
import { fail } from "assert";
import { arrayNotEmpty } from "class-validator";
import { OrderAction, OrderStatus } from "~/orders/constants/order-status";
import { FullOrderId } from "~/orders/dto/full-order-id.dto";
import { OrdersStatusService } from "~/orders/orders-status.service";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { OrdersRepository } from "~/repositories/orders/orders.repository";
import { AsaasService } from "./asaas/asaas.service";
import { appRecipientKey } from "./constants/app-recipient-key";
import { CompleteOrderDto as ClientData } from "./dto/complete-order.dto";
import { missingItemsAction } from "./functions/missing-items-action";
import { CustomerBalance } from "~/orders/functions/customer-debit";

type ServerData = OrdersRepository.CompleteData;

@Injectable()
export class CompleteOrderService {
  constructor(
    private readonly asaas: AsaasService,
    private readonly ordersStatus: OrdersStatusService,
    private readonly ordersRepo: OrdersRepository,
    private readonly marketsRepo: MarketsRepository,
    private readonly customersRepo: CustomersRepository
  ) {}

  async exec({ fullOrderId: id }: ClientData) {
    const order = await this.ordersRepo.completeData(id);

    if (order.status !== OrderStatus.Completing) return;

    if (arrayNotEmpty(order.missing_items))
      await this.handleMissingItems(id, order);

    await this.markAsCompleted(id);
  }

  private async handleMissingItems(id: FullOrderId, order: ServerData) {
    const creditLogs = await CustomerBalance.readDB(order.customer_id);
    const action = missingItemsAction(order, creditLogs);

    await Promise.all([
      this.ordersRepo.update(id, { customer_debit: action.orderOverTotal }),
      this.customersRepo.updateBalance(
        order.customer_id,
        action.customerBalance
      ),
      (async () => {
        const { type, data } = action.effect;

        if (type === "transferToMarket") {
          await this.transferToMarker(id, data.transferValue);
        } else if (type === "transferFromMarket") {
          await this.transferFromMarket(id, data.transferValue);
        }
      })(),
    ]);
  }

  private async transferToMarker({ market_id }: FullOrderId, value: number) {
    const recipientId = await this.marketsRepo.findRecipientId(market_id);
    await this.asaas.transfers.create({
      value,
      walletId: recipientId ?? fail(),
    });
  }

  private async transferFromMarket({ market_id }: FullOrderId, value: number) {
    const key = await this.marketsRepo.findRecipientKey(market_id);
    await this.asaas.transfers.create(
      { value, walletId: appRecipientKey() },
      key ?? fail()
    );
  }

  private async markAsCompleted(id: FullOrderId) {
    await this.ordersStatus.update(id, OrderAction.MarkAsCompleted);
  }
}
