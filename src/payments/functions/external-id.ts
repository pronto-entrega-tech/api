import { fail } from "assert";
import { FullInvoiceId } from "~/markets/dto/full-invoice-id";
import { FullOrderId } from "~/orders/dto/full-order-id.dto";

export function getTypeFromExternalRef(externalId?: string) {
  const [type] = externalId?.split("_") ?? [];
  return type ?? fail(`Invalid externalReference`);
}

// Customer

export function getCustomerExternalId(customer_id: string) {
  return `customer_${customer_id}`;
}

export function fromCustomerExternalId(externalId?: string) {
  const [type, customer_id] = externalId?.split("_") ?? [];
  if (type !== "customer" || !customer_id)
    return fail(`Invalid externalReference`);

  return customer_id;
}

// Market

export function getMarketExternalId(market_id: string) {
  return `market_${market_id}`;
}

export function fromMarketExternalId(externalId?: string) {
  const [type, market_id] = externalId?.split("_") ?? [];
  if (type !== "market" || !market_id) return fail(`Invalid externalReference`);

  return market_id;
}

// Order

export function getOrderExternalId({ order_id, market_id }: FullOrderId) {
  return `order_${order_id}_${market_id}`;
}

export function fromOrderExternalId(externalId?: string) {
  const [type, order_id, market_id] = externalId?.split("_") ?? [];
  if (type !== "order" || !order_id || !market_id)
    return fail(`Invalid externalReference`);

  return { order_id, market_id };
}

// Invoice

export function getInvoiceExternalId({ invoice_id, month }: FullInvoiceId) {
  const monthYear = month.toISOString().slice(0, 7);
  return `invoice_${invoice_id}_${monthYear}`;
}

export function fromInvoiceExternalId(externalId?: string) {
  const [type, invoice_id, month] = externalId?.split("_") ?? [];
  if (type !== "invoice" || !invoice_id || !month)
    return fail(`Invalid externalReference`);

  return { invoice_id, month };
}
