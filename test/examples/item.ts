import { item } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { omit } from '~/common/functions/omit';
import { pick } from '~/common/functions/pick';
import { CreateItemDto, SaveItemDto } from '~/items/dto/create.dto';
import { ItemDetails, ItemOneFeed } from '~/items/dto/feed.dto';
import { UpdateItemDto } from '~/items/dto/update.dto';
import { ActivityExtra } from '~/repositories/items/items.repository';
import { createMarket } from './market';
import { createProduct, createdProduct } from './product';

export const createItem = Prisma.validator<CreateItemDto>()({
  code: createProduct.code,
  market_price: new Decimal(10),
});

export const saveItem = Prisma.validator<SaveItemDto>()({
  ...createItem,
  quantity: null,
  item_id: 'itemId',
  city_slug: 'city-st',
  market_id: createMarket.market_id,
  prod_id: createdProduct.prod_id,
  ...pick(createProduct, 'name', 'brand'),
});

export const createdItem = Prisma.validator<Omit<item, 'item_id'>>()({
  ...omit(saveItem, 'item_id', 'code', 'name', 'brand', 'quantity'),
  market_price: new Decimal(saveItem.market_price),
  stock: null,
  unit_weight: null,
  is_kit: false,
  kit_name: null,
  kit_quantity: null,
  kit_image_name: null,
  discount_type: null,
  discount_value_1: null,
  discount_value_2: null,
  discount_max_per_client: null,
});

type _ItemFeed = Omit<
  ItemOneFeed,
  'name' | 'brand' | 'quantity' | 'images_names' | 'item_id' | 'prod_id'
>;
export const itemFeed = Prisma.validator<_ItemFeed>()({
  ...pick(
    createdItem,
    'is_kit',
    /* 'item_id',
    'prod_id', */
    'market_id',
    'unit_weight',
    'discount_type',
    'discount_value_1',
    'discount_value_2',
    'discount_max_per_client',
  ),
  price: '10.00',
  details: [] as ItemDetails[],
  thumbhash: null,
  market_thumbhash: null,
});

export const updateItem: UpdateItemDto = { stock: 10 };

export const activityExtra: ActivityExtra = {
  item_name: `${createProduct.name} ${createProduct.brand}`,
  market_id: createdItem.market_id,
  product_code: undefined,
};
