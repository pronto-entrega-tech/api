import { Length } from 'class-validator';

export class UpdateCardDto {
  @Length(1, 256)
  readonly nickname: string;
}
