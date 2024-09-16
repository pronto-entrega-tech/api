import { ConnectedSocket, OnGatewayConnection } from "@nestjs/websockets";
import { Socket } from "socket.io";

export class PassportGateway implements OnGatewayConnection {
  handleConnection(@ConnectedSocket() socket: Socket & { headers?: object }) {
    // make compatible with passport-jwt extract jwt
    const { token } = socket.handshake.auth;
    socket.headers = { authorization: `Bearer ${token}` };
  }
}
