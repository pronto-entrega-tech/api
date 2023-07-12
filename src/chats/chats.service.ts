import { Injectable } from '@nestjs/common';
import { ChatsRepository } from '~/repositories/chats/chats.repository';
import { OrdersRepository } from '~/repositories/orders/orders.repository';
import { ChatUpdateGateway } from './chat-update.gateway';
import { CreateChatMsgDto } from './dto/create-chat-msg.dto';

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepo: ChatsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly events: ChatUpdateGateway,
  ) {}

  async create(dto: CreateChatMsgDto & { customer_id?: string }) {
    const order = await this.ordersRepo.chatMsgData(dto);

    const chatMsg = await this.chatsRepo.create({ ...dto, ...order });
    this.events.chatUpdate(chatMsg);
    return chatMsg;
  }

  async findMany(ids: { customer_id: string; market_id: string }) {
    return this.chatsRepo.findMany(ids);
  }
}
