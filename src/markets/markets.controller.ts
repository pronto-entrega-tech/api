import {
  UnprocessableEntityException,
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
  UseInterceptors,
  PayloadTooLargeException,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  FileInterceptor,
  Options as MulterOptions,
  File,
} from "@nest-lab/fastify-multer";
import { AuthReq } from "~/auth/constants/auth-req";
import {
  ADMIN_ACCESS_TOKEN,
  CREATE_TOKEN,
  MARKET_ACCESS_TOKEN,
} from "~/auth/constants/auth-tokens";
import { Role } from "~/auth/constants/roles";
import { CreateAuthGuard, AccessAuthGuard } from "~/auth/guards/auth.guard";
import { Roles } from "~/auth/guards/roles.guard";
import { MiB } from "~/common/constants/bytes-sizes";
import { MarketFilter } from "~/common/dto/filter.dto";
import { AccessTokenAndSessionRes } from "~/responses/auth.res";
import { CreateBankAccountDto, CreateMarketDto } from "./dto/create.dto";
import { FindMarket } from "./dto/find-one.dto";
import { UpdateBankAccountDto, UpdateMarketDto } from "./dto/update.dto";
import { MarketsService } from "./markets.service";
import { UploadFileDto } from "./dto/upload-file.dto";
import { DeleteOpenFlipDto, CreateOpenFlipDto } from "./dto/open-flip.dto";

const validateImage: MulterOptions["fileFilter"] = (_, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/))
    return callback(new UnprocessableEntityException("File must be a image"));

  if (file.size && file.size >= 1 * MiB)
    return callback(
      new PayloadTooLargeException("File size must be lower than 1MiB"),
    );

  callback(null, true);
};

const MODULE_NAME = "Markets";

const CONTROLLER_NAME = MODULE_NAME.toLowerCase();

@ApiTags(MODULE_NAME)
@Controller(CONTROLLER_NAME)
export class MarketsController {
  constructor(private readonly markets: MarketsService) {}

  @ApiOperation({ summary: "Create a market account" })
  @ApiHeader({ name: CREATE_TOKEN })
  @UseGuards(CreateAuthGuard)
  @Roles(Role.Market)
  @Post()
  async create(
    @Req() { user: { sub: email } }: AuthReq,
    @Body() dto: CreateMarketDto,
  ): Promise<AccessTokenAndSessionRes> {
    return this.markets.create(email, dto);
  }

  @ApiOperation({ summary: "Find not approved markets" })
  @ApiBearerAuth(ADMIN_ACCESS_TOKEN)
  @UseGuards(AccessAuthGuard)
  @Roles(Role.Admin)
  @Get("not-approved")
  findNotApproved() {
    return this.markets.findNotApproved();
  }

  @ApiOperation({ summary: "Approves a market" })
  @ApiBearerAuth(ADMIN_ACCESS_TOKEN)
  @UseGuards(AccessAuthGuard)
  @Roles(Role.Admin)
  @Post(":market_id/approve")
  approve(@Param("market_id") market_id: string) {
    return this.markets.approve(market_id);
  }

  @ApiOperation({ summary: "Find many markets" })
  @Get(":city")
  findMany(@Param("city") city: string, @Query() query: MarketFilter) {
    return this.markets.findMany(city, query);
  }

  @ApiOperation({ summary: "Find one market" })
  @Get(":city/:market_id")
  findOne(@Param() { market_id }: FindMarket) {
    return this.markets.findOne(market_id);
  }

  @ApiOperation({ summary: "Find order reviews of market" })
  @Get(":city/:market_id/reviews")
  findReviews(@Param() { market_id }: FindMarket) {
    return this.markets.findReviews(market_id);
  }
}

@ApiBearerAuth(MARKET_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Market)
@ApiTags(`${MODULE_NAME} (Private)`)
@Controller(CONTROLLER_NAME)
export class MarketsPrivateController {
  constructor(private readonly markets: MarketsService) {}

  @ApiOperation({ summary: "Find profile information of a market" })
  @Get()
  findProfile(@Req() { user: { sub: id } }: AuthReq) {
    return this.markets.findProfile(id);
  }

  @ApiOperation({ summary: "Update a market account" })
  @Patch()
  update(@Req() { user: { sub: id } }: AuthReq, @Body() dto: UpdateMarketDto) {
    return this.markets.update(id, dto);
  }

  @ApiOperation({ summary: "Create a open flip on the market" })
  @Post("open-flip")
  createOpenFlip(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: CreateOpenFlipDto,
  ) {
    return this.markets.createOpenFlip(id, dto);
  }

  @ApiOperation({ summary: "Delete a open flip on the market" })
  @Delete("open-flip/:created_at")
  deleteOpenFlip(
    @Req() { user: { sub: id } }: AuthReq,
    @Param() dto: DeleteOpenFlipDto,
  ) {
    return this.markets.deleteOpenFlip(id, dto);
  }

  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a profile picture" })
  @UseInterceptors(
    FileInterceptor("picture", {
      dest: "/tmp/pronto-entrega-uploads",
      fileFilter: validateImage,
    }),
  )
  @Post("upload-picture")
  async uploadFile(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() _: UploadFileDto,
    @Req() { user: { sub: id } }: AuthReq,
    @UploadedFile() file?: File,
  ) {
    if (!file || !file.path)
      throw new BadRequestException("Image file must be attached");

    return this.markets.savePicture(id, file.path);
  }

  @ApiOperation({ summary: "Delete a market account" })
  @Delete()
  delete(@Req() { user: { sub: id } }: AuthReq) {
    return this.markets.delete(id);
  }

  @ApiOperation({ summary: "Save a bank account on the market" })
  @Post("bank-account")
  createBankAccount(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.markets.createBankAccount(id, dto);
  }

  @ApiOperation({ summary: "Update the bank account of the market" })
  @Patch("bank-account")
  updateBankAccount(
    @Req() { user: { sub: id } }: AuthReq,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.markets.updateBankAccount(id, dto);
  }

  @ApiOperation({ summary: "Find many market invoices" })
  @Get("invoices")
  findInvoices(@Req() { user: { sub: id } }: AuthReq) {
    return this.markets.findInvoices(id);
  }

  /* @ApiOperation({ summary: 'Find one market invoice' })
  @Get('invoice/:date/:invoice_id')
  findInvoice(
    @Req() { user }: AuthReq,
    @Param('date') date: string,
    @Param('invoice_id') id: string,
  ) {
    return this.markets.findOneInvoice(user, BigInt(id), new Date(date));
  } */

  @ApiOperation({ summary: "Find many market invoices" })
  @Get("payouts")
  findCurrentPayout(@Req() { user: { sub: id } }: AuthReq) {
    return this.markets.findCurrentPayout(id);
  }
}

export { CONTROLLER_NAME as MARKET_CONTROLLER_NAME };
