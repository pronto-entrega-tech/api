import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { AsaasRequests } from './asaas-requests';
import { Asaas } from './asaas.types';

@Injectable()
export class AsaasService {
  private readonly req = new AsaasRequests();

  readonly payments = new AsaasPayments(this.req);
  readonly accounts = new AsaasAccounts(this.req);
  readonly customers = new AsaasCustomers(this.req);
  readonly transfers = new AsaasTransfers(this.req);
  readonly errors = new AsaasErrors(this.req);

  tokenizeCard(params: Asaas.TokenizeCard) {
    const url = `/creditCard/tokenizeCreditCard`;

    return this.req.post<Asaas.TokenizedCard>(url, params);
  }

  balance(key?: string) {
    const url = `/finance/getCurrentBalance`;

    return this.req.get<Asaas.Balance>(url, key);
  }
}

class AsaasSubClass {
  constructor(protected readonly req: AsaasRequests) {}
}

class AsaasPayments extends AsaasSubClass {
  create(params: Asaas.CreatePayment) {
    const url = `/payments`;

    return this.req.post<Asaas.PaymentObject>(url, params);
  }

  find(id: string) {
    const url = `/payments/${id}`;

    return this.req.get<Asaas.PaymentObject>(url);
  }

  update(id: string, params: Asaas.CreatePayment) {
    const url = `/payments/${id}`;

    return this.req.post<Asaas.PaymentObject>(url, params);
  }

  delete(id: string) {
    const url = `/payments/${id}`;

    return this.req.delete<Asaas.PaymentObject>(url);
  }

  refund(id: string) {
    const url = `/payments/${id}/refund`;

    return this.req.post<Asaas.PaymentObject>(url, null);
  }

  findByExternalId(externalReference: string) {
    const url = `/payments?externalReference=${externalReference}`;

    return this.req.get<Asaas.PaymentPage>(url);
  }

  findPix(id: string) {
    const url = `/payments/${id}/pixQrCode`;

    return this.req.get<Asaas.PaymentPix>(url);
  }

  findBoleto(id: string) {
    const url = `/payments/${id}/identificationField`;

    return this.req.get<Asaas.PaymentBoleto>(url);
  }
}

class AsaasAccounts extends AsaasSubClass {
  create(params: Asaas.CreateAccount) {
    const url = `/accounts`;

    return this.req.post<Asaas.AccountObject>(url, params);
  }

  findByEmail(email: string) {
    const url = `/accounts?email=${email}`;

    return this.req.get<Asaas.AccountPage>(url);
  }
}

class AsaasCustomers extends AsaasSubClass {
  create(params: Asaas.CreateCustomer) {
    const url = `/customers`;

    return this.req.post<Asaas.CustomerObject>(url, params);
  }

  find(id: string) {
    const url = `/customers/${id}`;

    return this.req.get<Asaas.CustomerObject>(url);
  }

  findByExternalId(externalReference: string) {
    const url = `/customers?externalReference=${externalReference}`;

    return this.req.get<Asaas.CustomerPage>(url);
  }

  update(id: string, params: any) {
    const url = `/customers/${id}`;

    return this.req.post<Asaas.CustomerObject>(url, params);
  }

  delete(id: string) {
    const url = `/customers/${id}`;

    return this.req.delete<Asaas.CustomerObject>(url);
  }
}

class AsaasTransfers extends AsaasSubClass {
  create(params: Asaas.CreateTransfer, key?: string) {
    const url = `/transfers`;

    return this.req.post<Asaas.TransferObject>(url, params, key);
  }

  find(inicialDate: string, finalDate: string, key?: string) {
    const url = `/transfers?dateCreated[ge]${inicialDate}&dateCreated[le]=${finalDate}`;

    return this.req.get<Asaas.TransferPage>(url, key);
  }
}

class AsaasErrors extends AsaasSubClass {
  isInvalidCard(err: unknown) {
    return (
      err instanceof AxiosError &&
      err.response?.data.errors[0].code === 'invalid_action'
    );
  }
}
