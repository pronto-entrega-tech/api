export enum OrderStatus {
  PaymentProcessing = "PAYMENT_PROCESSING",
  PaymentFailed = "PAYMENT_FAILED",
  PaymentRequireAction = "PAYMENT_REQUIRE_ACTION",
  ApprovalPending = "APPROVAL_PENDING",
  Processing = "PROCESSING",
  DeliveryPending = "DELIVERY_PENDING",
  Completing = "COMPLETING",
  Completed = "COMPLETED",
  Canceling = "CANCELING",
  Canceled = "CANCELED",
}

export enum OrderAction {
  ProcessPayment = "PROCESS_PAYMENT",
  ConfirmPayment = "CONFIRM_PAYMENT",
  QuasiConfirmPayment = "QUASI_CONFIRM_PAYMENT",
  FailPayment = "FAIL_PAYMENT",
  Approve = "APPROVE",
  Delivery = "DELIVERY",
  Complete = "COMPLETE",
  Cancel = "CANCEL",
  MarkAsCompleted = "MARK_AS_COMPLETED",
  MarkAsCanceled = "MARK_AS_CANCELED",
}

export enum OrderPublicAction {
  Approve = "APPROVE",
  Delivery = "DELIVERY",
  Complete = "COMPLETE",
  Cancel = "CANCEL",
}
