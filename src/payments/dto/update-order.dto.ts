import { CancelOrderDto } from './cancel-order.dto';
import { CompleteOrderDto } from './complete-order.dto';
import { ConfirmOrderPaymentDto } from './confirm-order-payment.dto';
import { PayOrderDto } from './pay-order.dto';

export type UpdateOrderDto =
  | PayOrderDto
  | ConfirmOrderPaymentDto
  | CompleteOrderDto
  | CancelOrderDto;
