import { PartialType } from '@nestjs/swagger';
import { CreateMarketSubDto } from './create-sub.dto';

export class UpdateMarketSubDto extends PartialType(CreateMarketSubDto) {}
