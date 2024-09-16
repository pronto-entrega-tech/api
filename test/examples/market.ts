import {
  market_invoice,
  market_invoice_status,
  market_payout,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SubPermission } from '~/auth/constants/sub-permissions';
import { omit } from '~/common/functions/omit';
import {
  BankAccountType,
  HolderType,
  MarketsType,
} from '~/markets/constants/market-enums';
import { SaveMarketSubDto } from '~/markets/dto/create-sub.dto';
import { CreateMarketDto } from '~/markets/dto/create.dto';
import { CreateInvoices } from '~/markets/dto/invoice';
import { Asaas } from '~/payments/asaas/asaas.types';
import { InvoiceStatus } from '~/payments/constants/invoice-status';
import { currentMonth } from './common';

export const createMarket = Prisma.validator<
  CreateMarketDto & {
    email: string;
    market_id: string;
    now: Date;
  }
>()({
  now: currentMonth,
  market_id: 'marketId',
  email: 'market@email.com',
  type: MarketsType.Supermarket,
  name: 'Market Name',
  address_street: 'Street',
  address_number: '123',
  address_district: 'District',
  address_city: 'City',
  address_state: 'State',
  address_complement: 'Complement',
  min_time: new Prisma.Decimal(30),
  max_time: new Prisma.Decimal(60),
  delivery_fee: new Prisma.Decimal(0),
  order_min: new Prisma.Decimal(0),
  document: '123456789',
  payments_accepted: ['Cash'],
  markup: new Prisma.Decimal(0),
  business_hours: [],
  bank_account: {
    holder_name: 'Holder Name',
    holder_type: HolderType.Company,
    bank_number: '001',
    agency_number: '0001',
    account_number: '12345678',
    type: BankAccountType.Checking,
    document: '123456789',
  },
});

export const createMarket2 = {
  ...createMarket,
  market_id: 'marketId2',
  email: 'market2@email.com',
};

export const createdMarket = {
  ...omit(createMarket, 'now', 'bank_account'),
  city_slug: 'city-st',
  address_latitude: 0,
  address_longitude: 0,
};

export const createdMarket2 = {
  ...createdMarket,
  email: 'market2@email.com',
  market_id: 'marketId2',
};

export const createAsaasAccount: Asaas.CreateAccount & {
  walletId: string;
  apiKey: string;
} = {
  walletId: 'recipientId',
  apiKey: 'recipientKey',
  name: 'name',
  email: `${randomUUID()}@email.com`,
  cpfCnpj: '52998224725',
  companyType: 'ASSOCIATION',
  phone: '1112345678',
  postalCode: '12345678',
  addressNumber: '123',
};

export const createMarketSub = Prisma.validator<SaveMarketSubDto>()({
  id: 'marketSubId',
  name: 'Sub Name',
  permissions: [SubPermission.Delivery],
});

export const createInvoices = Prisma.validator<CreateInvoices>()({
  month: currentMonth,
  marketsAmount: [
    {
      id: 1n,
      market_id: createMarket.market_id,
      amount: new Prisma.Decimal(10),
    },
  ],
});

export const createdInvoice = Prisma.validator<Partial<market_invoice>>()({
  market_id: createMarket.market_id,
  month: currentMonth,
  amount: new Prisma.Decimal(10),
  status: InvoiceStatus.Processing as market_invoice_status,
});

export const createdPayout = Prisma.validator<Partial<market_payout>>()({
  market_id: createMarket.market_id,
  month: currentMonth,
  amount: new Prisma.Decimal(0),
});
