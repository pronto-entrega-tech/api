import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { chat_message } from '@prisma/client';
import { Server } from 'socket.io';
import { WsEvent, wsRoom, WS_PORT } from '~/common/constants/web-sockets';

@WebSocketGateway(WS_PORT)
export class ChatUpdateGateway {
  @WebSocketServer()
  private readonly server: Server;

  chatUpdate(chatMsg: chat_message) {
    this.server
      .to(wsRoom('customer', chatMsg.customer_id))
      .emit(WsEvent.ChatMsg, chatMsg);
  }
}
