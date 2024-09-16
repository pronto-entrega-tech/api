import TransformToBigInt from "~/common/decorators/to-bigint";

export class FullInvoiceId {
  @TransformToBigInt()
  readonly invoice_id: bigint;

  readonly month: Date;
}
