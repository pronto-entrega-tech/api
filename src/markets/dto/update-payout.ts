export type UpdatePayoutDto = {
  amount?: number;
  is_paid: boolean;
  paid_at: Date;
  payment_id?: string;
};
