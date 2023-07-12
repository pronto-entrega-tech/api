import { ApiHideProperty } from '@nestjs/swagger';
import { chat_message } from '@prisma/client';
import { IsString, Length } from 'class-validator';
import TransformToBigInt from '~/common/decorators/to-bigint';
import { ChatMessageAuthor } from '../constants/chat-message-author';
import TransformTrimString from '~/common/decorators/trim-string';

export class CreateChatMsgDto {
  @IsString()
  readonly market_id: string;

  @TransformToBigInt()
  readonly order_id: bigint;

  @TransformTrimString()
  @Length(1, 300)
  readonly message: string;

  @ApiHideProperty()
  readonly author: ChatMessageAuthor;
}

export type SaveChatMsgDto = CreateChatMsgDto &
  Pick<chat_message, 'customer_id' | 'market_order_id'>;
