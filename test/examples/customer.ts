import { customer } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { pick } from "~/common/functions/pick";
import { SaveCustomerDto } from "~/customers/dto/create.dto";
import { UpdateCustomerDto } from "~/customers/dto/update.dto";

export const createCustomer = Prisma.validator<SaveCustomerDto>()({
  customer_id: "customerId",
  name: "Customer",
  email: "customer@email.com",
  created_at: new Date(),
});

export const createdCustomer: customer = {
  ...createCustomer,
  document: null,
  phone: null,
  debit: null,
  asaas_id: null,
  social_provider: null,
};

export const foundCustomer = pick(
  createdCustomer,
  "email",
  "name",
  "document",
  "phone",
  "debit",
);

export const updateCustomer = Prisma.validator<UpdateCustomerDto>()({
  phone: "1112345678",
});

export const updatedCustomer: customer = {
  ...createdCustomer,
  ...updateCustomer,
};

export const deletedCustomer: customer = {
  ...createdCustomer,
  email: null,
  name: "[Apagado]",
};
