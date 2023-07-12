import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthReq } from '~/auth/constants/auth-req';
import { CUSTOMER_ACCESS_TOKEN } from '~/auth/constants/auth-tokens';
import { AccessAuthGuard } from '~/auth/guards/auth.guard';
import { Role } from '~/auth/constants/roles';
import { Roles } from '~/auth/guards/roles.guard';
import { CreateOrderBody } from './create-order.dto';
import { createOrder } from './create-order';

@ApiBearerAuth(CUSTOMER_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Customer)
@ApiTags('Orders')
@Controller('orders')
export default class CreateOrderController {
  @ApiOperation({ summary: 'Create a order' })
  @Post()
  create(
    @Req() { user: { sub: customer_id }, ip }: AuthReq,
    @Body() body: CreateOrderBody,
  ) {
    return createOrder({ ...body, customer_id, ip });
  }
}
