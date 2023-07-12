import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthReq } from '~/auth/constants/auth-req';
import {
  MARKET_ACCESS_TOKEN,
  MARKET_SUB_ACCESS_TOKEN,
} from '~/auth/constants/auth-tokens';
import { Role } from '~/auth/constants/roles';
import { AccessAuthGuard } from '~/auth/guards/auth.guard';
import { Roles } from '~/auth/guards/roles.guard';
import { ConnectTokenRes } from '~/responses/auth.res';
import { CreateMarketSubDto } from './dto/create-sub.dto';
import { UpdateMarketSubDto } from './dto/update-sub.dto';
import { MARKET_CONTROLLER_NAME } from './markets.controller';
import { MarketsService } from './markets.service';

const MODULE_NAME = 'Market sub-accounts';

const CONTROLLER_NAME = `${MARKET_CONTROLLER_NAME}/sub`;

@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Market)
@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class MarketSubsController {
  constructor(private readonly markets: MarketsService) {}

  @ApiOperation({ summary: 'Create a market sub-account' })
  @Post()
  async createSub(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: CreateMarketSubDto,
  ) {
    return this.markets.createSub(id, dto);
  }

  @ApiOperation({ summary: 'Generate an connect token' })
  @Post(':sub_id/connect-token')
  async genConnectSub(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('sub_id') sub_id: string,
  ): Promise<ConnectTokenRes> {
    return this.markets.genConnectSub(id, sub_id);
  }

  @ApiOperation({ summary: 'Find many market sub-accounts' })
  @Get()
  findManySubs(@Req() { user: { sub: id } }: AuthReq) {
    return this.markets.findManySubs(id);
  }

  @ApiOperation({ summary: 'Update a market sub-account' })
  @Patch(':sub_id')
  update(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('sub_id') sub_id: string,
    @Body() dto: UpdateMarketSubDto,
  ) {
    return this.markets.updateSub(id, sub_id, dto);
  }

  @ApiOperation({ summary: 'Delete a market account' })
  @Delete(':sub_id')
  delete(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('sub_id') sub_id: string,
  ) {
    return this.markets.deleteSub(id, sub_id);
  }
}

@ApiBearerAuth(MARKET_SUB_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.MarketSub)
@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class MarketSubsPrivateController {
  constructor(private readonly markets: MarketsService) {}

  @ApiOperation({ summary: 'Find profile information of market sub-account' })
  @Get('profile')
  findOneSub(@Req() { user: { sub: sub_id } }: AuthReq) {
    return this.markets.findOneSub(sub_id);
  }
}
