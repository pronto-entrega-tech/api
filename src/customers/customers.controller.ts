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
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { AuthReq } from '~/auth/constants/auth-req';
import {
  CREATE_TOKEN,
  CUSTOMER_ACCESS_TOKEN,
  CUSTOMER_REFRESH_TOKEN,
} from '~/auth/constants/auth-tokens';
import { Role } from '~/auth/constants/roles';
import { CreateAuthGuard, AccessAuthGuard } from '~/auth/guards/auth.guard';
import { Roles } from '~/auth/guards/roles.guard';
import authCookieOpts, {
  useCookieQueryOpts,
} from '~/common/functions/cookie-options';
import { CreateCardDto } from '~/customers/dto/create-card.dto';
import { UpdateCardDto } from '~/customers/dto/update-card.dto';
import { AccessTokenRes } from '~/responses/auth.res';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto, CustomerWSocialDto } from './dto/create.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update.dto';

const MODULE_NAME = 'Customers';

const CONTROLLER_NAME = MODULE_NAME.toLowerCase();

@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @ApiOperation({ summary: 'Create a customer account' })
  @ApiQuery(useCookieQueryOpts)
  @ApiHeader({ name: CREATE_TOKEN })
  @UseGuards(CreateAuthGuard)
  @Roles(Role.Customer)
  @Post()
  async create(
    @Query(useCookieQueryOpts.name) useCookie: boolean,
    @Req() { user: { sub: email } }: AuthReq,
    @Body() dto: CreateCustomerDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AccessTokenRes> {
    const result = await this.customers.create(email, dto);

    if (!useCookie) return result;

    const { refresh_token, expires_in, ...response } = result;
    res.setCookie(
      CUSTOMER_REFRESH_TOKEN,
      refresh_token,
      authCookieOpts(expires_in),
    );

    return response;
  }

  @ApiOperation({ summary: 'Sign-in with social login' })
  @ApiQuery(useCookieQueryOpts)
  @Post('social')
  async socialLogin(
    @Query(useCookieQueryOpts.name) useCookie: boolean,
    @Body() dto: CustomerWSocialDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AccessTokenRes> {
    const result = await this.customers.socialLogin(dto);

    if (!useCookie) return result;

    const { refresh_token, expires_in, ...response } = result;
    res.setCookie(
      CUSTOMER_REFRESH_TOKEN,
      refresh_token,
      authCookieOpts(expires_in),
    );

    return response;
  }
}

@ApiBearerAuth(CUSTOMER_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Customer)
@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class CustomersPrivateController {
  constructor(private readonly customers: CustomersService) {}

  @ApiOperation({ summary: 'Find a customer account' })
  @Get()
  find(@Req() { user: { sub: id } }: AuthReq) {
    return this.customers.find(id);
  }

  @ApiOperation({ summary: 'Update a customer account' })
  @Patch()
  update(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a customer account' })
  @Delete()
  delete(@Req() { user: { sub: id } }: AuthReq) {
    return this.customers.delete(id);
  }

  @ApiOperation({ summary: 'Create a address on customer' })
  @Post('addresses')
  createAddress(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customers.addresses.create(id, dto);
  }

  @ApiOperation({ summary: 'Find addresses of customer' })
  @Get('addresses')
  findAddresses(@Req() { user: { sub: id } }: AuthReq) {
    return this.customers.addresses.findMany(id);
  }

  @ApiOperation({ summary: 'Update address of customer' })
  @Patch('addresses/:address_id')
  updateAddress(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('address_id') address_id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.customers.addresses.update(id, address_id, dto);
  }

  @ApiOperation({ summary: 'Delete address of customer' })
  @Delete('addresses/:address_id')
  deleteAddress(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('address_id') address_id: string,
  ) {
    return this.customers.addresses.delete(id, address_id);
  }

  @ApiOperation({
    summary: 'Starts the process to save a payment card of a customer',
  })
  @Post('cards')
  createCard(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: CreateCardDto,
  ) {
    return this.customers.cards.create(id, dto);
  }

  @ApiOperation({ summary: 'Find saved payment cards of a customer' })
  @Get('cards')
  findCards(@Req() { user: { sub: id } }: AuthReq) {
    return this.customers.cards.findMany(id);
  }

  @ApiOperation({ summary: 'Update saved payment cards of a customer' })
  @Patch('cards/:card_id')
  updateCard(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('card_id') card_id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.customers.cards.update(id, card_id, dto);
  }

  @ApiOperation({ summary: 'Delete saved payment card of a customer' })
  @Delete('cards/:card_id')
  deleteCard(
    @Req() { user: { sub: id } }: AuthReq,
    @Param('card_id') card_id: string,
  ) {
    return this.customers.cards.delete(id, card_id);
  }
}
