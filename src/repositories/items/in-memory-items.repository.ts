import { Injectable } from '@nestjs/common';
import { item, item_activity, item_details } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import cuid from 'cuid';
import { NotFoundError } from '~/common/errors/not-found';
import { TestPropertyError } from '~/common/errors/test-property';
import { decimalOrNull } from '~/common/functions/decimal-or-null';
import { pick } from '~/common/functions/pick';
import { SaveItemDto, SaveKitDto } from '~/items/dto/create.dto';
import { ItemOneFeed } from '~/items/dto/feed.dto';
import { FullItemId } from '~/items/dto/full-item-id.dto';
import { UpdateItemDto } from '~/items/dto/update.dto';
import { ActivityExtra, ItemById } from './items.repository';

@Injectable()
export class InMemoryItemsRepository {
  private readonly items = [] as item[];
  private readonly details = new Map<string, item_details[]>();
  private readonly activity = [] as item_activity[];

  private getDiscountValues(dto: any) {
    return pick(
      dto,
      'discount_type',
      'discount_value_1',
      'discount_value_2',
      'discount_max_per_client',
    );
  }

  async create(dto: SaveItemDto) {
    const { name, brand, ..._dto } = dto;
    const { city_slug, market_id, market_sub_id, prod_id } = dto;

    const item: item = {
      stock: null,
      kit_name: null,
      kit_quantity: null,
      kit_image_name: null,
      is_kit: false,
      discount_type: null,
      discount_value_2: null,
      discount_max_per_client: null,
      ..._dto,
      item_id: dto.item_id ?? cuid(),
      market_price: new Decimal(dto.market_price),
      unit_weight: decimalOrNull(dto.unit_weight),
      discount_value_1: decimalOrNull(dto.discount_value_1),
      city_slug,
      market_id,
      prod_id,
    };
    this.items.push(item);

    this.activity.push({
      id: 1n,
      item_id: item.item_id,
      city_slug: dto.city_slug,
      new_details: [],
      occurred_at: new Date(),
      market_id,
      market_sub_id: market_sub_id ?? null,
      action: 'CREATE',
      product_code: dto.code,
      item_name: `${name} ${brand}`,
      new_price: decimalOrNull(dto.market_price),
      new_stock: dto.stock ?? null,
      new_unit_weight: decimalOrNull(dto.unit_weight),
      new_discount: this.getDiscountValues(dto) ?? null,
    });

    return item;
  }

  async createKit(dto: SaveKitDto) {
    if (!dto.item_id) throw new TestPropertyError('item_id');

    const { city_slug, market_id, market_sub_id, details } = dto;

    const item: item = {
      prod_id: null,
      stock: null,
      is_kit: false,
      discount_type: null,
      discount_value_2: null,
      discount_max_per_client: null,
      ...dto,
      item_id: dto.item_id,
      market_price: new Decimal(dto.market_price),
      unit_weight: decimalOrNull(dto.unit_weight),
      discount_value_1: decimalOrNull(dto.discount_value_1),
      city_slug,
      market_id,
    };
    this.items.push(item);

    this.details.set(
      item.item_id,
      details.map<item_details>((d, i) => ({
        ...d,
        quantity: new Decimal(d.quantity),
        id: BigInt(i + 1),
        item_id: item.item_id,
        city_slug: item.city_slug,
      })),
    );

    this.activity.push({
      id: BigInt(this.activity.length + 1),
      item_id: null,
      city_slug: null,
      product_code: null,
      occurred_at: new Date(),
      market_id,
      market_sub_id: market_sub_id ?? null,
      action: 'CREATE',
      item_name: dto.kit_name,
      new_price: decimalOrNull(dto.market_price),
      new_stock: dto.stock ?? null,
      new_unit_weight: decimalOrNull(dto.unit_weight),
      new_discount: this.getDiscountValues(dto) ?? null,
      new_details: (details as any) ?? null,
    });

    return item;
  }

  async exist(
    market_id: string,
    city_slug: string,
    params: { prod_id?: bigint; kit_name?: string },
  ) {
    const { prod_id, kit_name } = params;
    return !!this.items.find(
      (i) =>
        i.market_id === market_id &&
        i.city_slug === city_slug &&
        (i.prod_id === prod_id || i.kit_name === kit_name),
    );
  }

  async findMany(city_slug: string, market: string | string[]) {
    return this.items.filter(
      (i) => market.includes(i.market_id) && i.city_slug === city_slug,
    );
  }

  async findOne({ city_slug: city, item_id }: FullItemId) {
    const item = this.items.find(
      (i) => i.item_id === item_id && i.city_slug === city,
    );
    if (!item) throw new NotFoundError('Item');

    const itemOneFeed: ItemOneFeed = {
      ...pick(
        item,
        'is_kit',
        'item_id',
        'market_id',
        'prod_id',
        'discount_type',
        'discount_value_2',
        'discount_max_per_client',
      ),
      price: item.market_price.toFixed(2),
      unit_weight: item.unit_weight?.toFixed(2) ?? null,
      discount_value_1: item.discount_value_1?.toFixed(2) ?? null,
      details:
        this.details.get(item_id)?.map(({ quantity }) => ({
          name: 'Product name',
          quantity,
        })) ?? [],
      name: '',
      brand: '',
      quantity: '',
      images_names: [],
    };
    return itemOneFeed;
  }

  async marketFindOne(
    { city_slug: city, item_id }: FullItemId,
    market_id: string,
  ) {
    const item = this.items.find(
      (i) =>
        i.market_id === market_id &&
        i.item_id === item_id &&
        i.city_slug === city,
    );
    if (!item) throw new NotFoundError('Item');
    return { ...pick(item, 'is_kit', 'kit_name'), item, product: {} };
  }

  async findByIds(itemIds: string[], city_slug: string): Promise<ItemById[]> {
    const items = this.items.filter(
      (i) => i.city_slug === city_slug && itemIds.includes(i.item_id),
    );
    return items.map((item) => ({
      ...pick(
        item,
        'item_id',
        'prod_id',
        'market_price',
        'is_kit',
        'discount_max_per_client',
        'discount_type',
        'discount_value_1',
        'discount_value_2',
      ),
      market: { markup: new Decimal(0) },
      details:
        this.details
          .get(item.item_id)
          ?.map((details) => pick(details, 'prod_id', 'quantity')) ?? [],
    }));
  }

  async update(
    { item_id, city_slug: city }: FullItemId,
    dto: UpdateItemDto,
    { item_name, market_id, market_sub_id }: ActivityExtra,
  ) {
    const i = this.items.findIndex(
      (i) => i.item_id === item_id && i.city_slug === city,
    );
    if (i < 0) throw new NotFoundError('Item');

    this.activity.push({
      id: BigInt(this.activity.length + 1),
      item_id: null,
      city_slug: null,
      product_code: null,
      occurred_at: new Date(),
      market_id,
      market_sub_id: market_sub_id ?? null,
      action: 'UPDATE',
      item_name,
      new_price: decimalOrNull(dto.market_price),
      new_stock: dto.stock ?? null,
      new_unit_weight: decimalOrNull(dto.unit_weight),
      new_discount: null,
      new_details: [],
    });

    return (this.items[i] = { ...this.items[i], ...dto });
  }

  async delete(
    { item_id, city_slug: city }: FullItemId,
    activityExtra: ActivityExtra,
  ) {
    const i = this.items.findIndex(
      (item) => item.item_id === item_id && item.city_slug === city,
    );
    if (i < 0) throw new NotFoundError('Item');

    this.activity.forEach((a, i) => {
      if (!(a.item_id === item_id && a.city_slug === city)) return;

      this.activity[i] = {
        ...this.activity[i],
        item_id: null,
        city_slug: null,
      };
    });

    const item = this.items.splice(i, 1)[0];
    this.details.delete(item_id);

    this.activity.push({
      id: BigInt(this.activity.length + 1),
      item_id,
      city_slug: city,
      occurred_at: new Date(),
      market_sub_id: null,
      new_price: null,
      new_stock: null,
      new_unit_weight: null,
      new_discount: null,
      new_details: [],
      ...activityExtra,
      product_code: activityExtra.product_code ?? null,
      action: 'DELETE',
    });

    return item;
  }

  async findActivities(market_id: string) {
    return this.activity.filter((a) => a.market_id === market_id);
  }

  async findActivitiesById(
    market_id: string,
    { item_id, city_slug: city }: FullItemId,
  ) {
    return this.activity.filter(
      (a) =>
        a.market_id === market_id &&
        a.item_id === item_id &&
        a.city_slug === city,
    );
  }
}
