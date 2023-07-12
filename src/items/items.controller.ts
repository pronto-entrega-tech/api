import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { SubPermission } from '~/auth/constants/sub-permissions';
import { AccessAuthGuard } from '~/auth/guards/auth.guard';
import { Roles } from '~/auth/guards/roles.guard';
import { SubPermissions } from '~/auth/guards/sub-permissions.guard';
import { ItemFeedFilter, ItemFilter } from '~/common/dto/filter.dto';
import { getMarketOrSubId } from '~/common/functions/user-id';
import { CreateItemDto, CreateKitDto, LoggingDto } from './dto/create.dto';
import { FullItemId } from './dto/full-item-id.dto';
import { UpdateItemDto, UpdateKitDto } from './dto/update.dto';
import { ItemsService } from './items.service';

const MODULE_NAME = 'Items';

const CONTROLLER_NAME = MODULE_NAME.toLowerCase();

@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @ApiOperation({ summary: 'Find many items by city' })
  @Get(':city_slug')
  feed(@Param('city_slug') city: string, @Query() params: ItemFeedFilter) {
    return this.itemsService.feed(city, params);
  }

  @ApiOperation({ summary: 'Find many items by market' })
  @Get(':city_slug/market/:market_id')
  feedByMarket(
    @Param('city_slug') city: string,
    @Param('market_id') market_id: string,
    @Query() params: ItemFilter,
  ) {
    return this.itemsService.feed(city, { ...params, market_id });
  }

  @ApiOperation({ summary: 'Find one item' })
  @Get(':city_slug/:item_id')
  findOne(@Param() params: FullItemId) {
    return this.itemsService.findOne(params);
  }
}

@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@ApiBearerAuth(MARKET_SUB_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Market, Role.MarketSub)
@SubPermissions(SubPermission.Stock)
@ApiTags(`${MODULE_NAME} (Market)`)
@Controller(CONTROLLER_NAME)
export class ItemsPrivateController {
  constructor(private readonly itemsService: ItemsService) {}

  @ApiOperation({ summary: 'Log information' })
  @Post('logging')
  logging(@Body() body: LoggingDto) {
    return this.itemsService.logging(body);
  }

  @ApiOperation({ summary: 'Create a item' })
  @Post()
  create(@Req() { user }: AuthReq, @Body() dto: CreateItemDto) {
    return this.itemsService.create(getMarketOrSubId(user), dto);
  }

  @ApiOperation({ summary: 'Create a kit' })
  @Post('kit')
  createKit(@Req() { user }: AuthReq, @Body() dto: CreateKitDto) {
    return this.itemsService.createKit(getMarketOrSubId(user), dto);
  }

  @ApiOperation({ summary: 'Find item by code or description' })
  @Get()
  findOne(@Req() { user }: AuthReq, @Query('query') query: string) {
    const market_id = user.role === Role.MarketSub ? user.market_id : user.sub;
    return this.itemsService.findOneQuery(market_id, query);
  }

  @ApiOperation({ summary: 'Find activities' })
  @Get('activities')
  findActivities(@Req() { user }: AuthReq, @Query('query') query: string) {
    const { market_id } = getMarketOrSubId(user);
    return this.itemsService.findActivities(market_id, { query });
  }

  @ApiOperation({ summary: 'Find activities by product id' })
  @Get(':city_slug/:item_id/activities')
  findActivitiesById(@Req() { user }: AuthReq, @Param() fullId: FullItemId) {
    const { market_id } = getMarketOrSubId(user);
    return this.itemsService.findActivities(market_id, { fullId });
  }

  @ApiOperation({ summary: 'Update a item' })
  @Patch(':city_slug/:item_id')
  update(
    @Req() { user }: AuthReq,
    @Param() params: FullItemId,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(getMarketOrSubId(user), params, dto);
  }

  @ApiOperation({ summary: 'Update a kit' })
  @Patch('kit/:city_slug/:item_id')
  updateKit(
    @Req() { user }: AuthReq,
    @Param() params: FullItemId,
    @Body() dto: UpdateKitDto,
  ) {
    return this.itemsService.updateKit(getMarketOrSubId(user), params, dto);
  }

  @ApiOperation({ summary: 'Delete a item' })
  @Delete(':city_slug/:item_id')
  delete(@Req() { user }: AuthReq, @Param() params: FullItemId) {
    return this.itemsService.delete(getMarketOrSubId(user), params);
  }
}
