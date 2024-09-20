import { Injectable } from "@nestjs/common";
import { market_sub } from "@prisma/client";
import { join } from "path";
import sharp from "sharp";
import { AuthToken } from "~/auth/constants/auth-tokens";
import { Role } from "~/auth/constants/roles";
import { SubPermission } from "~/auth/constants/sub-permissions";
import { SessionsService } from "~/auth/sessions/sessions.service";
import { STATIC_PATH } from "~/common/constants/paths";
import { MarketFilter } from "~/common/dto/filter.dto";
import { Month } from "~/common/functions/month";
import { removeAccents } from "~/common/functions/remove-accents";
import { LocationService } from "~/location/location.service";
import { PaymentAccountsService } from "~/payments/accounts/payment-accounts.service";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { CreateMarketSubDto } from "./dto/create-sub.dto";
import { CreateBankAccountDto, CreateMarketDto } from "./dto/create.dto";
import { DeleteOpenFlipDto, CreateOpenFlipDto } from "./dto/open-flip.dto";
import { UpdateMarketSubDto } from "./dto/update-sub.dto";
import { UpdateBankAccountDto, UpdateMarketDto } from "./dto/update.dto";
import { getThumbHash } from "~/common/functions/getThumbHash";

@Injectable()
export class MarketsService {
  constructor(
    private readonly sessions: SessionsService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly location: LocationService,
    private readonly marketsRepo: MarketsRepository
  ) {}

  async create(email: string, dto: CreateMarketDto) {
    const marketDto = await this.createMarketDto(email, dto);

    const market_id = await this.marketsRepo.create(marketDto);

    await this.paymentAccounts.initCreatePayer(market_id);
    if (dto.bank_account)
      await this.paymentAccounts.initCreateRecipient(market_id);

    return this.sessions.createAndGenToken({
      sub: market_id,
      role: Role.Market,
    });
  }

  private async createMarketDto(email: string, dto: CreateMarketDto) {
    const coords = await this.getCoords(dto);

    const city = removeAccents(dto.address_city).replace(/ /g, "-");
    const city_slug = `${city}-${dto.address_state}`.toLowerCase();

    return {
      ...dto,
      email,
      city_slug,
      ...coords,
    };
  }

  private async getCoords(dto: CreateMarketDto) {
    const coords = await this.location.coords({
      address: `${dto.address_street},${dto.address_number},${dto.address_district},${dto.address_city},${dto.address_state}`,
    });

    return { address_latitude: coords.lat, address_longitude: coords.lng };
  }

  findNotApproved() {
    return this.marketsRepo.findNotApproved();
  }

  approve(market_id: string) {
    return this.marketsRepo.approve(market_id);
  }

  findMany(city: string, location: MarketFilter) {
    return this.marketsRepo.findMany(city, location);
  }

  findOne(market_id: string) {
    return this.marketsRepo.findOne(market_id);
  }

  findProfile(market_id: string) {
    return this.marketsRepo.findProfile(market_id);
  }

  findReviews(market_id: string) {
    return this.marketsRepo.findReviews(market_id);
  }

  update(market_id: string, dto: UpdateMarketDto) {
    return this.marketsRepo.update(market_id, dto);
  }

  createOpenFlip(market_id: string, dto: CreateOpenFlipDto) {
    return this.marketsRepo.createOpenFlip(market_id, dto);
  }

  deleteOpenFlip(market_id: string, dto: DeleteOpenFlipDto) {
    return this.marketsRepo.deleteOpenFlip(market_id, dto);
  }

  delete(market_id: string) {
    return this.marketsRepo.delete(market_id);
  }

  async savePicture(market_id: string, filePath: string) {
    const destination = join(STATIC_PATH, `market/${market_id}.webp`);

    await sharp(filePath).webp().toFile(destination);

    const imageThumbHash = await getThumbHash(destination);
    await this.marketsRepo.updateThumbhash(market_id, imageThumbHash);
  }

  async createBankAccount(market_id: string, dto: CreateBankAccountDto) {
    const bank = await this.marketsRepo.createBankAccount(market_id, dto);

    await this.paymentAccounts.initCreateRecipient(market_id);

    return bank;
  }

  async updateBankAccount(market_id: string, dto: UpdateBankAccountDto) {
    return this.marketsRepo.updateBankAccount(market_id, dto);
  }

  findInvoices(market_id: string) {
    return this.marketsRepo.invoices.findByMarket(market_id);
  }

  findCurrentPayout(market_id: string) {
    return this.marketsRepo.payouts.findOne(market_id, Month.getCurrent());
  }

  async createSub(market_id: string, dto: CreateMarketSubDto) {
    await this.marketsRepo.checkIfExist(market_id);
    return this.marketsRepo.subs.create(market_id, dto);
  }

  async genConnectSub(market_id: string, id: string) {
    await this.marketsRepo.checkIfExist(market_id);
    const sub = await this.marketsRepo.subs.findOne(market_id, id);

    return this.connectToken(sub);
  }

  private async connectToken(sub: market_sub) {
    return {
      connect_token: await this.sessions.genToken({
        sub: sub.id,
        role: Role.MarketSub,
        type: AuthToken.Connect,
        market_id: sub.market_id,
        sub_permissions: sub.permissions as SubPermission[],
      }),
    };
  }

  findManySubs(market_id: string) {
    return this.marketsRepo.subs.findMany(market_id);
  }

  findOneSub(id: string) {
    return this.marketsRepo.subs.findOneById(id);
  }

  updateSub(market_id: string, id: string, dto: UpdateMarketSubDto) {
    return this.marketsRepo.subs.update(market_id, id, dto);
  }

  deleteSub(market_id: string, id: string) {
    return this.marketsRepo.subs.delete(market_id, id);
  }
}
