import {
  IsOptional,
  IsPositive,
  Max,
  Length,
  IsInt,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';
import TransformTrimString from '~/common/decorators/trim-string';
import { FullOrderId } from './full-order-id.dto';

export class CreateReviewBody {
  @IsInt()
  @IsPositive()
  @Max(5)
  readonly rating: number;

  @TransformTrimString()
  @IsOptional()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @Length(1, 256, { each: true })
  readonly complaint?: string[];

  @TransformTrimString()
  @IsOptional()
  @Length(1, 256)
  readonly message?: string;
}

export type CreateReviewDto = CreateReviewBody &
  FullOrderId & { customer_id: string };

export class RespondReviewBody {
  @TransformTrimString()
  @Length(1, 256)
  readonly response: string;
}

export type RespondReviewDto = RespondReviewBody & FullOrderId;
