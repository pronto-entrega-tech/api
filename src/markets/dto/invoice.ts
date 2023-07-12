import { Decimal } from '@prisma/client/runtime';
import { InvoiceStatus } from '~/payments/constants/invoice-status';

export type CreateInvoices = {
  month: Date;
  marketsAmount: { id?: bigint; market_id: string; amount: Decimal }[];
};

export type UpdateInvoice = {
  status?: InvoiceStatus;
  payment_id?: string;
  boleto_code?: string;
  boleto_pdf_url?: string;
  boleto_expires_at?: Date;
  pix_code?: string;
  pix_expires_at?: Date;
};
