export namespace Asaas {
  type Pagination<T> = {
    object: 'list';
    hasMore: boolean;
    totalCount: number;
    limit: number;
    offset: number;
    data: T;
  };

  export type BillingType = 'CREDIT_CARD' | 'BOLETO' | 'PIX';
  export type BankAccountType = 'CONTA_CORRENTE' | 'CONTA_POUPANCA';
  type PaymentStatus =
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED'
    | 'REFUND_REQUESTED'
    | 'AWAITING_RISK_ANALYSIS';

  export type CreatePayment = {
    customer: string;
    billingType: BillingType;
    /**
     * @example 42.69
     */
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
    fine?: { value: number };
    postalService?: boolean;
    split?: {
      walletId: string;
      fixedValue?: number;
      percentualValue?: number;
    }[];
    creditCardToken?: string;
    remoteIp?: string;
  };

  export type PaymentObject = {
    object: 'payment';
    id: string;
    dataCreated: string;
    customer: string;
    dueDate: string;
    value: number;
    netValue: number;
    billingType: BillingType;
    status: PaymentStatus;
    externalReference?: string;
    bankSlipUrl?: string;
    deleted: boolean;
  };

  export type PaymentPage = Pagination<PaymentObject[]>;

  export type PaymentPix = {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };

  export type PaymentBoleto = {
    identificationField: string;
  };

  export type CreateAccount = {
    name: string;
    email: string;
    cpfCnpj: string;
    companyType?: 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';
    phone: string;
    //mobilePhone: string;
    postalCode: string;
    addressNumber: string;
  };

  export type AccountObject = {
    email: string;
    walletId: string;
    apiKey: string;
  };

  export type AccountPage = Pagination<AccountObject[]>;

  export type CreateCustomer = {
    name: string;
    cpfCnpj?: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    city?: string;
    postalCode?: string;
    externalReference?: string;
    notificationDisabled?: boolean;
    observations?: string;
    groupName?: string;
  };

  export type CustomerObject = {
    id: string;
    cpfCnpj: string | null;
    externalReference?: string;
    deleted: boolean;
  };

  export type CustomerPage = Pagination<CustomerObject[]>;

  export type TokenizeCard = {
    creditCardNumber: string;
    creditCardHolderName: string;
    creditCardExpiryMonth: string;
    creditCardExpiryYear: string;
    creditCardCcv: string;
    customer: string;
  };

  export type TokenizedCard = {
    creditCardToken: string;
    creditCardBrand: string;
    creditCardNumber: string;
  };

  export type Balance = {
    totalBalance: number;
  };

  export type CreateTransfer = { value: number } & (
    | TransferToAsaasAccount
    | TransferToBankAccount
    | TransferWithPix
  );
  type TransferToAsaasAccount = { walletId: string; bankAccount?: undefined };
  type TransferToBankAccount = {
    walletId?: undefined;
    bankAccount: {
      bank: {
        code: string;
      };
      accountName?: string;
      ownerName: string;
      /**
       * Required if cpfCnpj don't match with Asaas account.
       */
      ownerBirthDate?: string;
      cpfCnpj: string;
      agency: string;
      account: string;
      accountDigit: string;
      bankAccountType: BankAccountType;
    };
  };
  type TransferWithPix = {
    walletId?: undefined;
    bankAccount?: undefined;
    pixAddressKey: string;
    pixAddressKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  };

  export type TransferObject = {
    object: 'transfer';
    id: string;
    dateCreated: string;
    status: 'PENDING' | 'BANK_PROCESSING' | 'DONE' | 'CANCELLED' | 'FAILED';
    effectiveDate: string;
    type: 'BANK_ACCOUNT' | 'ASAAS_ACCOUNT';
    value: number;
    netValue: number;
    transferFee: number;
    scheduleDate: string;
    authorized: boolean;
    failReason: string | null;
    walletId?: string;
    bankAccount?: {
      bank: {
        code: string;
        name: string;
      };
      accountName?: string;
      ownerName: string;
      ownerBirthDate?: string;
      cpfCnpj: string;
      agency: string;
      account: string;
      accountDigit: string;
      bankAccountType: BankAccountType;
    };
    transactionReceiptUrl: string;
    operationType: 'PIX' | 'TED' | 'INTERNAL';
  };

  export type TransferPage = Pagination<TransferObject[]>;

  export type WebHookBody = {
    event: 'PAYMENT_RECEIVED';
    payment: {
      externalReference?: string;
      billingType: BillingType;
    };
  };
}
