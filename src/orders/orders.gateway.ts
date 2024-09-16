import { UseGuards } from "@nestjs/common";
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { plainToInstance } from "class-transformer";
import { AuthSocket } from "~/auth/constants/auth-req";
import { Role } from "~/auth/constants/roles";
import { SubPermission } from "~/auth/constants/sub-permissions";
import { AccessAuthGuard } from "~/auth/guards/auth.guard";
import { Roles } from "~/auth/guards/roles.guard";
import { SubPermissions } from "~/auth/guards/sub-permissions.guard";
import { PassportGateway } from "~/auth/passport.gateway";
import { WsEvent, wsRoom, WS_PORT } from "~/common/constants/web-sockets";
import { getMarketOrSubId } from "~/common/functions/user-id";
import { FullOrderId } from "./dto/full-order-id.dto";
import { SubscribeOrdersDto } from "./dto/subscribe.dto";
import { OrdersService } from "./orders.service";

@WebSocketGateway(WS_PORT)
export class OrdersGateway extends PassportGateway {
  constructor(private readonly orders: OrdersService) {
    super();
  }

  @UseGuards(AccessAuthGuard)
  @Roles(Role.Customer)
  @SubscribeMessage(WsEvent.Orders)
  async findOne(
    @MessageBody() data: SubscribeOrdersDto,
    @ConnectedSocket() socket: AuthSocket
  ) {
    const customer_id = socket.user.sub;
    const { order_id, market_id } = data;

    const fullId = plainToInstance(FullOrderId, { order_id, market_id });
    const order = await this.orders.customerFindOne({ customer_id, ...fullId });

    socket.emit(WsEvent.Orders, order);
    await socket.join(wsRoom("order", order_id));

    const status = await this.orders.status(fullId);
    if (status !== order.status)
      socket.emit(WsEvent.Orders, { order_id: order.order_id, status });
  }

  @UseGuards(AccessAuthGuard)
  @Roles(Role.Market, Role.MarketSub)
  @SubPermissions(SubPermission.Delivery)
  @SubscribeMessage(WsEvent.ActiveOrder)
  async findMany(@ConnectedSocket() socket: AuthSocket) {
    const { market_id } = getMarketOrSubId(socket.user);

    const orders = await this.orders.findMany({ market_id });

    socket.emit(WsEvent.Orders, ...orders);
    const _orders = orders as { order_id: bigint }[];
    await socket.join(_orders.map(({ order_id }) => wsRoom("order", order_id)));

    const statuses = await this.orders.manyStatus(
      market_id,
      _orders.map(({ order_id }) => order_id)
    );
    const differentStatuses = statuses.filter(
      ({ status }, i) => status !== orders[i]?.status
    );
    if (differentStatuses.length)
      socket.emit(WsEvent.Orders, ...differentStatuses);
  }
}
