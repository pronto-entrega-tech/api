import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthReq } from '~/auth/constants/auth-req';
import {
  CUSTOMER_ACCESS_TOKEN,
  MARKET_ACCESS_TOKEN,
} from '~/auth/constants/auth-tokens';
import { Role } from '~/auth/constants/roles';
import { AccessAuthGuard } from '~/auth/guards/auth.guard';
import { Roles } from '~/auth/guards/roles.guard';
import { getCustomerOrMarketId } from '~/common/functions/user-id';
import { ChatsService } from './chats.service';
import { ChatMessageAuthor } from './constants/chat-message-author';
import { CreateChatMsgDto } from './dto/create-chat-msg.dto';

@ApiBearerAuth(CUSTOMER_ACCESS_TOKEN)
@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Customer, Role.Market)
@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @ApiOperation({ summary: 'Create a chat message' })
  @Post()
  create(@Req() { user }: AuthReq, @Body() dto: CreateChatMsgDto) {
    return this.chats.create({
      ...dto,
      ...getCustomerOrMarketId(user),
      author: user.role as unknown as ChatMessageAuthor,
    });
  }

  @ApiOperation({ summary: 'Find chat messages' })
  @Get(':customer_or_market_id')
  findMany(
    @Req() { user }: AuthReq,
    @Param('customer_or_market_id') customer_or_market_id: string,
  ) {
    return this.chats.findMany(
      user.role === Role.Customer
        ? { customer_id: user.sub, market_id: customer_or_market_id }
        : { customer_id: customer_or_market_id, market_id: user.sub },
    );
  }
}
