export type UpdateOrder = (typeof updateOrder)[keyof typeof updateOrder];
export const updateOrder = {
  Pay: "PAY",
  ConfirmPayment: "CONFIRM_PAYMENT",
  Complete: "COMPLETE",
  Cancel: "CANCEL",
} as const;
