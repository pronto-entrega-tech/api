import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { products } from "@prisma/client";
import { writeFile } from "fs/promises";
import { join } from "path";
import { ItemFeedFilter, ItemFilter } from "~/common/dto/filter.dto";
import { AlreadyExistError } from "~/common/errors/already-exist";
import { NotFoundError } from "~/common/errors/not-found";
import { pick } from "~/common/functions/pick";
import { ItemsRepository } from "~/repositories/items/items.repository";
import { MarketsRepository } from "~/repositories/markets/markets.repository";
import { ProductsRepository } from "~/repositories/products/products.repository";
import {
  CreateDetailsDto,
  CreateItemDto,
  CreateKitDto,
} from "./dto/create.dto";
import { FullItemId } from "./dto/full-item-id.dto";
import { UpdateItemDto, UpdateKitDto } from "./dto/update.dto";
import { getProductName } from "./functions/product-name";
import { ItemUpdateGateway } from "./item-update.gateway";

type MarketOrSubId = { market_id: string; market_sub_id?: string };

@Injectable()
export class ItemsService {
  constructor(
    private readonly itemsRepo: ItemsRepository,
    private readonly productsRepo: ProductsRepository,
    private readonly marketsRepo: MarketsRepository,
    private readonly events: ItemUpdateGateway
  ) {}
  private readonly logger = new Logger(ItemsService.name);
  private readonly SHARED_PATH = process.env.SHARED_PATH ?? "";

  async logging(data: string) {
    const path = join(this.SHARED_PATH, `item-logging-${Date.now()}`);
    await writeFile(path, data).catch((err) => this.logger.error(err));
  }

  async create(marketIds: MarketOrSubId, dto: CreateItemDto) {
    const { code } = dto;
    const { city_slug } = await this.marketsRepo.findOne(marketIds.market_id);

    const prod = await this.productsRepo.findOneByCode(code);
    if (!prod) {
      this.logger.error(`code ${code} not found`);
      throw new NotFoundError("Product", ["code"]);
    }

    const existingItem = await this.itemsRepo.exist(
      marketIds.market_id,
      city_slug,
      { prod_id: prod.prod_id }
    );
    if (existingItem) throw new AlreadyExistError("Item", ["code"]);

    const res = await this.itemsRepo.create({
      ...dto,
      ...marketIds,
      ...prod,
      city_slug,
    });

    const { market_id, item_id } = res;
    this.events.itemUpdate(market_id, res.activity, {
      item_id,
      price: res.market_price,
      stock: res.stock,
      product: { code, ...pick(prod, "name", "brand", "quantity") },
    });
    return res;
  }

  async createKit(marketIds: MarketOrSubId, { details, ...dto }: CreateKitDto) {
    const { city_slug } = await this.marketsRepo.findOne(marketIds.market_id);

    const existingItem = await this.itemsRepo.exist(
      marketIds.market_id,
      city_slug,
      { kit_name: dto.kit_name }
    );
    if (existingItem) throw new AlreadyExistError("Item", ["kit_name"]);

    return this.itemsRepo.createKit({
      ...dto,
      ...marketIds,
      city_slug,
      details: await this.kitDetails(details),
    });
  }

  private async kitDetails(details: CreateDetailsDto[]) {
    const prodCodes = details.map((v) => v.code);
    const prodIds = await this.productsRepo.findIdsByCodes(prodCodes);

    const missingProductFail = () => {
      const notFoundCodes = prodCodes.filter((id) => !prodIds.includes(id));
      this.logger.error(`Missing product code: ${notFoundCodes.toString()}`);
      throw new NotFoundException(
        `Product code ${notFoundCodes.toString()} not found`
      );
    };

    return details.map(({ quantity }, i) => ({
      prod_id: prodIds[i] ?? missingProductFail(),
      quantity,
    }));
  }

  async feed(city: string, filter: ItemFilter) {
    const market =
      filter.market_id ??
      (filter.latLong && (await this.nearbyMarkets(filter, city)));

    return this.itemsRepo.findMany(city, market, filter);
  }

  async findMany(market_id: string) {
    return this.itemsRepo.marketFindMany(market_id);
  }

  async findOneQuery(market_id: string, query: string) {
    return this.itemsRepo.marketFindOneQuery(market_id, query);
  }

  private async nearbyMarkets(filter: ItemFeedFilter, city: string) {
    const locFilter = pick(filter, "latLong", "distance", "order_by");
    return this.marketsRepo.findMany(city, { ...locFilter, justIds: true });
  }

  findOne(fullId: FullItemId) {
    return this.itemsRepo.findOne(fullId);
  }

  async findActivities(
    market_id: string,
    params: { fullId?: FullItemId; query?: string }
  ) {
    return this.itemsRepo.findActivities(market_id, params);
  }

  async update(
    marketIds: MarketOrSubId,
    fullId: FullItemId,
    dto: UpdateItemDto
  ) {
    this.validateUpdateDto(dto);

    const oldItem = await this.oldItem(marketIds, fullId);
    const { is_kit, kit_name, product } = oldItem;

    if (is_kit) throw new BadRequestException("This item is a kit");

    const item_name = this.itemName(kit_name, product, fullId);

    const res = await this.itemsRepo.update(fullId, dto, {
      product_code: product?.code,
      item_name,
      ...marketIds,
    });

    const { market_id, item_id } = res;
    this.events.itemUpdate(market_id, res.activity, {
      item_id,
      code: product?.code ?? undefined,
      price: dto.market_price,
      stock: dto.stock,
    });
    return res;
  }

  async updateKit(
    marketIds: MarketOrSubId,
    fullId: FullItemId,
    dto: UpdateKitDto
  ) {
    this.validateUpdateDto(dto);

    const oldItem = await this.oldItem(marketIds, fullId);
    const { is_kit, kit_name, product } = oldItem;

    if (!is_kit) throw new BadRequestException("This item isn't a kit");

    const item_name = this.itemName(kit_name, product, fullId);

    const res = await this.itemsRepo.updateKit(fullId, dto, {
      product_code: product?.code,
      item_name,
      ...marketIds,
    });

    const { market_id, item_id } = res;
    this.events.itemUpdate(market_id, res.activity, {
      item_id,
      code: product?.code ?? undefined,
      price: dto.market_price,
      stock: dto.stock,
    });
    return res;
  }

  async delete(marketIds: MarketOrSubId, fullId: FullItemId) {
    const { kit_name, product } = await this.oldItem(marketIds, fullId);

    const item_name = this.itemName(kit_name, product, fullId);

    return this.itemsRepo.delete(fullId, {
      product_code: product?.code,
      item_name,
      ...marketIds,
    });
  }

  private validateUpdateDto(dto: UpdateKitDto) {
    const dtoValues = Object.values(dto);
    const hasSomething = dtoValues.filter((v) => v != null).length;
    if (!hasSomething)
      throw new BadRequestException("Must have at least one field");
  }

  private async oldItem({ market_id }: MarketOrSubId, fullId: FullItemId) {
    return this.itemsRepo.marketFindOne(fullId, market_id);
  }

  private itemName(
    kit_name: string | null,
    product: products | null,
    fullId: FullItemId
  ) {
    const item_name = kit_name ?? (product && getProductName(product));
    if (!item_name) this.logger.log("Item don't have a name", fullId);

    return item_name ?? "Sem nome";
  }
}
