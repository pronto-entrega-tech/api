import { Module } from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { ChatsGateway } from "./chats.gateway";
import { ChatUpdateGateway } from "./chat-update.gateway";
import { ChatsController } from "./chats.controller";

@Module({
  providers: [ChatsGateway, ChatUpdateGateway, ChatsService],
  controllers: [ChatsController],
})
export class ChatsModule {}
