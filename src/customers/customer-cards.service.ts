import { Injectable } from '@nestjs/common';
import { UpdateCardDto } from '~/customers/dto/update-card.dto';
import { PaymentAccountsService } from '~/payments/accounts/payment-accounts.service';
import { PaymentCardsService } from '~/payments/cards/payment-cards.service';
import { CustomersRepository } from '~/repositories/customers/customers.repository';
import { CreateCardDto } from './dto/create-card.dto';

@Injectable()
export class CustomerCardsService {
  constructor(
    private readonly paymentCards: PaymentCardsService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async create(customer_id: string, dto: CreateCardDto) {
    const payerId = await this.payerId(customer_id);

    const card = await this.paymentCards.create(payerId, dto);

    const { nickname } = dto;
    return this.customersRepo.cards.create({
      customer_id,
      nickname,
      ...card,
    });
  }

  private async payerId(customer_id: string) {
    const payerId = await this.customersRepo.findPayerId(customer_id);
    if (payerId) return payerId;

    const customer = await this.customersRepo.findOne(customer_id);
    const payer = await this.paymentAccounts.createCustomerPayer({
      customer_id,
      name: customer.name,
      email: customer.email,
      document: customer.document ?? undefined,
    });
    return payer.id;
  }

  findMany(customer_id: string) {
    return this.customersRepo.cards.findMany(customer_id);
  }

  update(customer_id: string, card_id: string, dto: UpdateCardDto) {
    return this.customersRepo.cards.update(customer_id, card_id, dto);
  }

  delete(customer_id: string, card_id: string) {
    return this.customersRepo.cards.delete(customer_id, card_id);
  }
}
