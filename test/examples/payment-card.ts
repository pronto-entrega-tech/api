import { Prisma } from "@prisma/client";
import { CreateCardDto, SaveCardDto } from "~/customers/dto/create-card.dto";
import { createCustomer } from "./customer";

export const createPaymentCard: CreateCardDto = {
  nickname: "My Card",
  number: "0000000000000000",
  holderName: "Name",
  expiryMonth: "01",
  expiryYear: "2100",
  cvv: "123",
};

export const savePaymentCard = Prisma.validator<SaveCardDto>()({
  id: "cardId",
  customer_id: createCustomer.customer_id,
  nickname: createPaymentCard.nickname,
  brand: "BRAND",
  last4: "0000",
  asaas_id: "asaasId",
});
