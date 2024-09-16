import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { item_activity } from "@prisma/client";
import { Server } from "socket.io";
import { WsEvent, wsRoom, WS_PORT } from "~/common/constants/web-sockets";
import { ItemMarketFeed } from "./dto/feed.dto";

@WebSocketGateway(WS_PORT)
export class ItemUpdateGateway {
  @WebSocketServer()
  private readonly server: Server;

  itemUpdate(
    market_id: string,
    activity: item_activity,
    payload: Partial<ItemMarketFeed> & { item_id: string; code?: bigint },
  ) {
    const { item_id } = payload;

    const room = this.server.to([
      wsRoom("market", market_id),
      wsRoom("item", item_id),
    ]);
    room.emit(WsEvent.Items, payload);
    room.emit(WsEvent.ItemsActivities, activity);
  }
}
