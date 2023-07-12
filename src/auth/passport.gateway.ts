import { ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { Socket } from 'socket.io';

export class PassportGateway implements OnGatewayConnection {
  async handleConnection(@ConnectedSocket() socket: Socket) {
    // make compatible with passport-jwt extract jwt
    const { token } = socket.handshake.auth;
    (socket as any).headers = { authorization: `Bearer ${token}` };
  }
}
