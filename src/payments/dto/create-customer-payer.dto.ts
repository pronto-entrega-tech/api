export class CreateCustomerPayerDto {
  readonly customer_id: string;
  readonly name: string;
  readonly email: string;
  readonly document?: string;
}

export class CustomerPayerReturnDto {
  readonly id: string;
}
