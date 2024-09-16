import { UseGuards } from "@nestjs/common";
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
} from "@nestjs/websockets";
import { AuthSocket } from "~/auth/constants/auth-req";
import { Role } from "~/auth/constants/roles";
import { AccessAuthGuard } from "~/auth/guards/auth.guard";
import { Roles } from "~/auth/guards/roles.guard";
import { PassportGateway } from "~/auth/passport.gateway";
import { WsEvent, wsRoom, WS_PORT } from "~/common/constants/web-sockets";
import { ItemsService } from "./items.service";

@WebSocketGateway(WS_PORT)
export class ItemsGateway extends PassportGateway {
  constructor(private readonly items: ItemsService) {
    super();
  }

  @UseGuards(AccessAuthGuard)
  @Roles(Role.Market)
  @SubscribeMessage(WsEvent.Items)
  async findMany(@ConnectedSocket() socket: AuthSocket) {
    const market_id = socket.user.sub;

    const items = await this.items.findMany(market_id);

    socket.emit(WsEvent.Items, ...items);
    await socket.join(wsRoom("market", market_id));
  }
}
