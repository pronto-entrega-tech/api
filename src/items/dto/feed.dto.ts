import { ApiProperty } from '@nestjs/swagger';
import {
  discount_type,
  item,
  item_details,
  products,
  market,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';

export class ItemFeed
  implements
    Omit<
      item,
      | 'market_price'
      | 'stock'
      | 'city_slug'
      | 'kit_name'
      | 'kit_quantity'
      | 'kit_image_name'
      | 'unit_weight'
      | 'discount_value_1'
    >
{
  item_id: string;
  market_id: string;
  thumbhash: products['thumbhash'];
  market_thumbhash: market['thumbhash'];
  name: string;
  brand: string | null;
  quantity: string;
  is_kit: boolean;
  discount_type: discount_type | null;
  discount_value_2: number | null;
  discount_max_per_client: number | null;
  images_names: string[];
  price: string;
  prod_id: bigint | null;
  unit_weight: string | null;
  discount_value_1: string | null;
}

export class ItemOneFeed extends ItemFeed {
  details: ItemDetails[];
}

type IItemDetails = Pick<item_details, 'quantity'> & Pick<products, 'name'>;

export class ItemDetails implements IItemDetails {
  name: string;

  @ApiProperty({ type: String })
  quantity: Decimal;
}

export type ItemMarketFeed = {
  item_id: item['item_id'];
  price: item['market_price'];
  stock: item['stock'];
  product: Pick<products, 'code' | 'name' | 'brand' | 'quantity'>;
};
