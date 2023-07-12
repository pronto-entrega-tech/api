import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthReq } from '~/auth/constants/auth-req';
import {
  CUSTOMER_ACCESS_TOKEN,
  MARKET_ACCESS_TOKEN,
  MARKET_SUB_ACCESS_TOKEN,
} from '~/auth/constants/auth-tokens';
import { AccessAuthGuard } from '~/auth/guards/auth.guard';
import { CancelOrderBody } from './dto/cancel.dto';
import { CreateOrderBody } from './dto/create.dto';
import { FindManyOrdersDto } from './dto/find-many.dto';
import { FullOrderId } from './dto/full-order-id.dto';
import { RetryOrderPaymentBody } from './dto/retry-payment.dto';
import { CreateConfirmationTokenBody, UpdateOrderBody } from './dto/update.dto';
import { CreateReviewBody, RespondReviewBody } from './dto/review.dto';
import { OrdersService } from './orders.service';
import { Role } from '~/auth/constants/roles';
import { Roles } from '~/auth/guards/roles.guard';
import { getMarketOrSubId } from '~/common/functions/user-id';
import { SubPermissions } from '~/auth/guards/sub-permissions.guard';
import { SubPermission } from '~/auth/constants/sub-permissions';
import { JwtPayload } from '~/auth/constants/jwt-payload';

@ApiBearerAuth(CUSTOMER_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Customer)
@ApiTags('Orders')
@Controller('orders')
export class OrdersCustomerController {
  constructor(private readonly orders: OrdersService) {}

  @ApiOperation({ summary: 'Create a order' })
  @Post()
  create(
    @Req() { user: { sub: customer_id }, ip }: AuthReq,
    @Body() body: CreateOrderBody,
  ) {
    return this.orders.create({ ...body, customer_id, ip });
  }

  @ApiOperation({ summary: 'Find one order by customer' })
  @Get(':market_id/:order_id')
  findOne(
    @Req() { user: { sub: customer_id } }: AuthReq,
    @Param() fullId: FullOrderId,
  ) {
    return this.orders.customerFindOne({ customer_id, ...fullId });
  }

  @ApiOperation({ summary: 'Retry to pay a order' })
  @Post(':market_id/:order_id/retry-payment')
  retryPayment(
    @Req() { user: { sub: customer_id }, ip }: AuthReq,
    @Param() fullId: FullOrderId,
    @Body() body: RetryOrderPaymentBody,
  ) {
    return this.orders.retryPayment({ customer_id, ip, ...fullId, ...body });
  }

  @ApiOperation({ summary: 'Create a order review' })
  @Post(':market_id/:order_id/review')
  review(
    @Req() { user: { sub: customer_id } }: AuthReq,
    @Param() fullId: FullOrderId,
    @Body() body: CreateReviewBody,
  ) {
    return this.orders.createReview({ customer_id, ...fullId, ...body });
  }

  @ApiOperation({ summary: 'Create a order confirmation token' })
  @Post(':market_id/:order_id/confirmation-token')
  createConfirmationToken(
    @Req() { user: { sub: customer_id } }: AuthReq,
    @Param() fullId: FullOrderId,
    @Body() body: CreateConfirmationTokenBody,
  ) {
    return this.orders.createConfirmationToken({
      customer_id,
      ...fullId,
      ...body,
    });
  }

  @ApiOperation({ summary: 'Cancel a order' })
  @Post(':market_id/:order_id/cancel')
  cancel(
    @Req() { user: { sub: customer_id } }: AuthReq,
    @Param() fullId: FullOrderId,
    @Body() dto: CancelOrderBody,
  ) {
    return this.orders.customerCancel({ customer_id, ...fullId, ...dto });
  }
}

@ApiBearerAuth(CUSTOMER_ACCESS_TOKEN)
@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@ApiBearerAuth(MARKET_SUB_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Customer, Role.Market, Role.MarketSub)
@ApiTags('Orders')
@Controller('orders')
export class OrderCustomerAndMarketController {
  constructor(private readonly orders: OrdersService) {}

  @ApiOperation({ summary: 'Find many orders' })
  @Get()
  findMany(@Req() { user }: AuthReq, @Query() query: FindManyOrdersDto) {
    return this.orders.findMany(
      user.role === Role.Customer
        ? { customer_id: user.sub }
        : user.role === Role.MarketSub
        ? { market_id: user.market_id }
        : { market_id: user.sub },
      query,
    );
  }
}

@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@ApiBearerAuth(MARKET_SUB_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Market, Role.MarketSub)
@SubPermissions(SubPermission.Delivery)
@ApiTags('Orders')
@Controller('orders/market')
export class OrderMarketController {
  constructor(private readonly orders: OrdersService) {}

  @ApiOperation({ summary: 'Update a order by market' })
  @Patch(':order_id')
  update(
    @Req() { user }: AuthReq,
    @Param('order_id') order_id: string,
    @Body() body: UpdateOrderBody,
  ) {
    return this.orders.update({ ...body, ...getFullId(user, order_id) });
  }

  @ApiOperation({ summary: 'Respond the review' })
  @Post(':order_id/respond-review')
  respondReview(
    @Req() { user }: AuthReq,
    @Param('order_id') order_id: string,
    @Body() body: RespondReviewBody,
  ) {
    return this.orders.respondReview({ ...body, ...getFullId(user, order_id) });
  }
}

const getFullId = (user: JwtPayload, order_id: string) => {
  const { market_id } = getMarketOrSubId(user);
  return plainToInstance(FullOrderId, { order_id, market_id });
};
