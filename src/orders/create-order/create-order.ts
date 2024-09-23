import { confirmationToken } from "../common/confirmation-token";
import { queueOrderPayment } from "../common/init-order-payment";
import { validateInAppPayment } from "../common/validate-in-app-payment";
import { createOrderDto } from "../functions/create-order-dto";
import { OneCustomerDebit } from "../functions/customer-debit";
import { OrderUpdateGateway } from "../order-update.gateway";
import { CreateOrderDto as ClientData } from "./create-order.dto";
import { CreateOrderRepo as DB } from "./create-order.repo";

export async function createOrder(
  client: ClientData,
  events: OrderUpdateGateway,
) {
  {
    const order = await saveOrderOnDB();
    events.orderCreate(order);

    if (client.paid_in_app) await queueOrderPayment(order);

    return {
      ...order,
      confirmation_token: await confirmationToken(order),
    };
  }

  async function saveOrderOnDB() {
    const [, server] = await Promise.all([
      client.paid_in_app ? validateInAppPayment(client) : undefined,
      getServerData(),
    ]);

    const unsavedOrder = createOrderDto({ client, server });

    return DB.save(unsavedOrder);
  }

  async function getServerData() {
    const [items, market, lastMarketOrderId, card, creditLogs] =
      await Promise.all([
        DB.findItems(client),
        DB.findMarket(client),
        DB.lastMarketOrderId(client),
        client.card_id
          ? DB.findCustomerCard(client, client.card_id)
          : undefined,
        client.paid_in_app
          ? OneCustomerDebit.readDB(client.customer_id)
          : undefined,
      ]);

    return { items, market, lastMarketOrderId, card, creditLogs };
  }
}
