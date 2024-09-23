import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { WsEvent, wsRoom, WS_PORT } from "~/common/constants/web-sockets";
import { UpdateOrderPaymentDto } from "./dto/update.dto";
import { orders } from "@prisma/client";

@WebSocketGateway(WS_PORT)
export class OrderUpdateGateway {
  @WebSocketServer()
  private readonly server: Server;

  orderUpdate(order: { order_id: bigint } & Partial<UpdateOrderPaymentDto>) {
    this.server.to(wsRoom("order", order.order_id)).emit(WsEvent.Orders, order);
  }

  orderCreate(order: orders) {
    this.server
      .to(wsRoom("market", order.market_id))
      .emit(WsEvent.Orders, order);
  }
}
