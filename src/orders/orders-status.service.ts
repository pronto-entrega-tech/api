import { ConflictException, HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { LockedAction } from "~/common/constants/locked-actions";
import { pick } from "~/common/functions/pick";
import { newStateMachine } from "~/common/functions/state-machine";
import { MutexService } from "~/common/mutex/mutex.service";
import { OrdersRepository } from "~/repositories/orders/orders.repository";
import { OrderPublicAction as PublicAction } from "./constants/order-status";
import {
  OrderAction as Action,
  OrderStatus as Status,
} from "./constants/order-status";
import { FullOrderId } from "./dto/full-order-id.dto";
import { UpdateOrderExtraDto } from "./dto/update.dto";
import { OrderUpdateGateway } from "./order-update.gateway";

@Injectable()
export class OrdersStatusService {
  constructor(
    private readonly mutex: MutexService,
    private readonly ordersRepo: OrdersRepository,
    private readonly events: OrderUpdateGateway,
  ) {}

  private readonly machine = {
    [Status.PaymentProcessing]: {
      [Action.ConfirmPayment]: Status.ApprovalPending,
      [Action.QuasiConfirmPayment]: Status.PaymentRequireAction,
      [Action.FailPayment]: Status.PaymentFailed,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.PaymentFailed]: {
      [Action.ProcessPayment]: Status.PaymentProcessing,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.PaymentRequireAction]: {
      [Action.ProcessPayment]: Status.PaymentProcessing,
      [Action.ConfirmPayment]: Status.ApprovalPending,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.ApprovalPending]: {
      [Action.Approve]: Status.Processing,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.Processing]: {
      [Action.Delivery]: Status.DeliveryPending,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.DeliveryPending]: {
      [Action.Complete]: Status.Completing,
      [Action.Cancel]: Status.Canceling,
    },
    [Status.Completing]: {
      [Action.MarkAsCompleted]: Status.Completed,
    },
    [Status.Canceling]: {
      [Action.MarkAsCanceled]: Status.Canceled,
    },
  };
  private readonly stateMachine = newStateMachine(this.machine);

  update<T>(
    fullOrderId: FullOrderId,
    action: Action | PublicAction,
    extra?: Prisma.Exact<T, UpdateOrderExtraDto>,
  ) {
    return this.execUnderMutex(fullOrderId, () =>
      this.nonAtomicUpdate(
        fullOrderId,
        action,
        extra as UpdateOrderExtraDto | undefined,
      ),
    );
  }

  customerUpdate<T>(
    customer_id: string,
    fullOrderId: FullOrderId,
    action: Action | PublicAction,
    extra?: Prisma.Exact<T, UpdateOrderExtraDto>,
  ) {
    return this.execUnderMutex(fullOrderId, () =>
      this.nonAtomicCustomerUpdate(
        customer_id,
        fullOrderId,
        action,
        extra as UpdateOrderExtraDto | undefined,
      ),
    );
  }

  private execUnderMutex<T>(fullOrderId: FullOrderId, fn: () => Promise<T>) {
    return this.mutex.exec(
      LockedAction.UpdateOrderStatus,
      `${fullOrderId.order_id}`,
      fn,
    );
  }

  private async nonAtomicUpdate(
    fullOrderId: FullOrderId,
    action: Action | PublicAction,
    extra?: UpdateOrderExtraDto,
  ) {
    const status = await this.ordersRepo.status(fullOrderId);

    return this.validateStatus(status as Status, fullOrderId, action, extra);
  }

  private async nonAtomicCustomerUpdate(
    customer_id: string,
    fullOrderId: FullOrderId,
    action: Action | PublicAction,
    extra?: UpdateOrderExtraDto,
  ) {
    const status = await this.ordersRepo.customerFindStatus(
      customer_id,
      fullOrderId,
    );

    return this.validateStatus(status as Status, fullOrderId, action, extra);
  }

  private async validateStatus(
    status: Status,
    fullOrderId: FullOrderId,
    action: Action | PublicAction,
    extra?: UpdateOrderExtraDto,
  ) {
    const nextStatus = this.stateMachine.reduce(status, action);

    if (!nextStatus)
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: `Action ${action} isn't valid, status: ${status}`,
        status,
      });

    const res = await this.ordersRepo.update(fullOrderId, {
      status: nextStatus,
      ...extra,
    });

    const { order_id } = fullOrderId;
    this.events.orderUpdate({
      order_id,
      status: nextStatus,
      ...pick(
        extra ?? {},
        "finished_at",
        "payment_description",
        "payment_method",
        "pix_code",
        "pix_expires_at",
      ),
    });
    return res;
  }
}
