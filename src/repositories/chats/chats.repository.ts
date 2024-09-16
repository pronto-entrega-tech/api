import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SaveChatMsgDto } from "~/chats/dto/create-chat-msg.dto";
import { PrismaService } from "~/common/prisma/prisma.service";

@Injectable()
export class ChatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: SaveChatMsgDto) {
    const validData = Prisma.validator<Prisma.chat_messageCreateManyInput>();

    return this.prisma.chat_message.create({ data: validData(dto) });
  }

  async findMany({
    customer_id,
    market_id,
  }: {
    customer_id: string;
    market_id: string;
  }) {
    return this.prisma.chat_message.findMany({
      where: { customer_id, market_id },
    });
  }
}
