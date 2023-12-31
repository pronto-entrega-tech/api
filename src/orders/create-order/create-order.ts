import { UnauthorizedException } from '@nestjs/common';
import { confirmationToken } from '../common/confirmation-token';
import { queueOrderPayment } from '../common/init-order-payment';
import { validateInAppPayment } from '../common/validate-in-app-payment';
import { createOrderDto } from '../functions/create-order-dto';
import { CreateOrderDto as OrderCreationDto } from './create-order.dto';
import { CreateOrderRepo as Repo } from './create-order.repo';

export async function createOrder(dto: OrderCreationDto) {
  {
    const order = await saveOrderOnDB();

    if (dto.paid_in_app) await queueOrderPayment(order);

    return {
      ...order,
      confirmation_token: await confirmationToken(order),
    };
  }

  async function saveOrderOnDB() {
    const [, serverDto] = await Promise.all([
      validateOrderCreation(),
      getServerDto(),
    ]);

    const orderDto = createOrderDto({
      client: dto,
      server: serverDto,
    });

    return Repo.save(orderDto);
  }

  async function validateOrderCreation() {
    await Promise.all([
      validateCustomerExist(),
      ...(dto.paid_in_app ? [validateInAppPayment(dto)] : []),
    ]);

    async function validateCustomerExist() {
      const exist = await Repo.customerExist(dto.customer_id);

      if (!exist) throw new UnauthorizedException();
    }
  }

  async function getServerDto() {
    const [card, creditLogs, items, market, lastMarketOrderId] =
      await Promise.all([
        getCustomerCard(),
        getCreditLogs(),
        getItems(),
        Repo.market(dto.market_id),
        Repo.lastMarketOrderId(dto.market_id),
      ]);

    return { card, creditLogs, items, market, lastMarketOrderId };

    async function getCustomerCard() {
      return dto.card_id
        ? Repo.findCustomerCard(dto.customer_id, dto.card_id)
        : undefined;
    }

    async function getCreditLogs() {
      return dto.paid_in_app ? Repo.findCreditLogs(dto.customer_id) : undefined;
    }

    async function getItems() {
      const itemsIds = dto.items.map((v) => v.item_id);
      return Repo.findItems(itemsIds, dto.market_id);
    }
  }
}
