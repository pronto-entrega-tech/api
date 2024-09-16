import { UseGuards } from "@nestjs/common";
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { plainToInstance } from "class-transformer";
import { AuthSocket } from "~/auth/constants/auth-req";
import { Role } from "~/auth/constants/roles";
import { AccessAuthGuard } from "~/auth/guards/auth.guard";
import { Roles } from "~/auth/guards/roles.guard";
import { PassportGateway } from "~/auth/passport.gateway";
import { wsRoom, WS_PORT } from "~/common/constants/web-sockets";
import { FullOrderId } from "~/orders/dto/full-order-id.dto";
import { OrdersRepository } from "~/repositories/orders/orders.repository";

@UseGuards(AccessAuthGuard)
@Roles(Role.Customer, Role.Market)
@WebSocketGateway(WS_PORT)
export class ChatsGateway extends PassportGateway {
  constructor(private readonly ordersRepo: OrdersRepository) {
    super();
  }

  @SubscribeMessage("subscribeToChatMsgs")
  async subscribe(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() order_id: string,
  ) {
    const { ordersRepo } = this;
    const { sub: id, role } = socket.user;

    return role === Role.Customer ? customerSubscribe(id) : marketSubscribe(id);

    async function customerSubscribe(customer_id: string) {
      await socket.join(wsRoom("customer", customer_id));
    }

    async function marketSubscribe(market_id: string) {
      const fullOrderId = plainToInstance(FullOrderId, { order_id, market_id });
      const customer_id = await ordersRepo.customerId(fullOrderId);
      await socket.join(wsRoom("customer", customer_id));
    }
  }
}
