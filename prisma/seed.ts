import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.admin.upsert({
    where: { email: 'contato@prontoentrega.com.br' },
    update: {},
    create: {
      admin_id: '2f9bca0f-be4e-4905-a5b7-13bdd0001100',
      email: 'contato@prontoentrega.com.br',
    },
  });

  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS item_jatai_go PARTITION OF item FOR VALUES IN ('jatai-go');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS item_details_jatai_go PARTITION OF item_details FOR VALUES IN ('jatai-go');`;

  await prisma.categories.createMany({
    data: [
      { category_id: 1, name: 'Alimentos básicos' },
      { category_id: 2, name: 'Bebidas' },
      { category_id: 3, name: 'Bebidas alcoólicas' },
      { category_id: 4, name: 'Laticínios' },
      { category_id: 5, name: 'Biscoitos e salgadinho' },
      { category_id: 6, name: 'Doces e sobremesas' },
      { category_id: 7, name: 'Açougue e peixaria' },
      { category_id: 8, name: 'Congelados' },
      { category_id: 9, name: 'Padaria' },
      { category_id: 10, name: 'Queijos e frios' },
      { category_id: 11, name: 'Hortifrúti' },
      { category_id: 12, name: 'Higiene e cosméticos' },
      { category_id: 13, name: 'Limpeza' },
    ],
    skipDuplicates: true,
  });
  await prisma.market.createMany({
    data: [
      {
        market_id: 'market_1',
        city_slug: 'jatai-go',
        approved: true,
        type: 'SUPERMARKET',
        name: 'Garenjo',
        thumbhash: '3loHDwYniJiHeHiAfJd36EeGg4332HgP',
        address_street: 'Rua Itaruma',
        address_number: '355',
        address_district: 'Setor Santa Maria',
        address_city: 'Jataí',
        address_state: 'GO',
        address_latitude: -17.887342,
        address_longitude: -51.725129,
        min_time: 40,
        max_time: 50,
        delivery_fee: 5,
        order_min: 20,
        document: '12345678000103',
        payments_accepted: [
          'Dinheiro',
          'Pix',
          'Crédito Mastercard',
          'Crédito Visa',
        ],
        email: 'contato@prontoentrega.com.br',
        markup: 14.12,
      },
      {
        market_id: 'market_2',
        city_slug: 'jatai-go',
        approved: true,
        type: 'SUPERMARKET',
        name: 'Touros Mercado',
        thumbhash: 'URgOBwAoh4iHd3hwjId3yViHho3313gP',
        address_street: 'Rua Itaruma',
        address_number: '355',
        address_district: 'Setor Santa Maria',
        address_city: 'Jataí',
        address_state: 'GO',
        address_latitude: -17.887342,
        address_longitude: -51.725129,
        min_time: 40,
        max_time: 50,
        delivery_fee: 5,
        order_min: 20,
        document: '12345678000103',
        payments_accepted: [
          'Dinheiro',
          'Pix',
          'Crédito Mastercard',
          'Crédito Visa',
        ],
        email: 'contato2@prontoentrega.com.br',
        markup: 14.12,
      },
      {
        market_id: 'market_3',
        city_slug: 'jatai-go',
        approved: true,
        type: 'SUPERMARKET',
        name: 'Jaré da Maré',
        thumbhash: 'F9gEBwQHyHeHd4iAfYR3uFeGh3',
        address_street: 'Rua Itaruma',
        address_number: '355',
        address_district: 'Setor Santa Maria',
        address_city: 'Jataí',
        address_state: 'GO',
        address_latitude: -17.887342,
        address_longitude: -51.725129,
        min_time: 40,
        max_time: 50,
        delivery_fee: 5,
        order_min: 20,
        document: '12345678000103',
        payments_accepted: [
          'Dinheiro',
          'Pix',
          'Crédito Mastercard',
          'Crédito Visa',
        ],
        email: 'contato3@prontoentrega.com.br',
        markup: 14.12,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS item_activity_market_1 PARTITION OF item_activity FOR VALUES IN ('market_1');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS orders_market_1 PARTITION OF orders FOR VALUES IN ('market_1');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS order_item_market_1 PARTITION OF order_item FOR VALUES IN ('market_1');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS order_item_details_market_1 PARTITION OF order_item_details FOR VALUES IN ('market_1');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS order_missing_item_market_1 PARTITION OF order_missing_item FOR VALUES IN ('market_1');`;
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS review_market_1 PARTITION OF review FOR VALUES IN ('market_1');`;

  await prisma.business_hour.createMany({
    data: [
      {
        id: 1,
        market_id: 'market_1',
        days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        open_time: '10:00',
        close_time: '22:00',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.products.createMany({
    data: [
      {
        prod_id: 1,
        code: 5463746174537,
        name: 'Refrigerante Original',
        brand: 'Coca-Cola',
        quantity: 'Garrafa 2l',
        category_id: 2,
        images_names: ['1'],
      },
      {
        prod_id: 2,
        code: 2416420975375,
        name: 'Arroz Branco',
        brand: 'Cristal',
        quantity: 'Pacote 5kg',
        category_id: 1,
        images_names: ['2'],
      },
      {
        prod_id: 3,
        code: 4640426163742,
        name: 'Filé de Peito de Frango',
        brand: 'Sadia',
        quantity: 'Bandeja 1kg',
        category_id: 8,
        images_names: ['3'],
      },
      {
        prod_id: 4,
        code: 2426547537537,
        name: 'Achocolatado Original',
        brand: 'Toddy',
        quantity: 'Pote 200g',
        category_id: 6,
        images_names: ['4'],
      },
      {
        prod_id: 5,
        code: 3428747357514,
        name: 'Biscoito Rosca Coco',
        brand: 'Mabel',
        quantity: 'Pacote 700',
        category_id: 5,
        images_names: ['5'],
      },
      {
        prod_id: 6,
        code: 4278467537575,
        name: 'Leite Integral',
        brand: 'Italac',
        quantity: 'Caixa 1l',
        category_id: 4,
        images_names: ['6'],
      },
    ],
    skipDuplicates: true,
  });
  await prisma.item.createMany({
    data: [
      {
        item_id: '1',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 1,
        market_price: 5,
        discount_type: 'DISCOUNT_PERCENT_ON_SECOND',
        discount_value_1: 20,
      },
      {
        item_id: '2',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 2,
        market_price: 22.5,
        discount_type: 'DISCOUNT_VALUE',
        discount_value_1: 20,
      },
      {
        item_id: '3',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 3,
        market_price: 14.69,
        discount_type: 'DISCOUNT_PERCENT',
        discount_value_1: 20,
      },
      {
        item_id: '4',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 4,
        market_price: 4.25,
      },
      {
        item_id: '5',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 5,
        market_price: 8.2,
        discount_type: 'ONE_FREE',
        discount_value_1: 3,
      },
      {
        item_id: '6',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        prod_id: 6,
        market_price: 4.84,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.item_activity.createMany({
    data: [
      {
        id: 1,
        action: 'CREATE',
        item_id: '1',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 5463746174537,
        item_name: 'Refrigerante Original Coca-Cola Garrafa 2l',
        new_price: 5,
        new_discount:
          '{ "discount_type": "DISCOUNT_PERCENT_ON_SECOND", "discount_value_1": 20 }',
      },
      {
        id: 2,
        action: 'CREATE',
        item_id: '2',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 2416420975375,
        item_name: 'Arroz Branco Cristal Pacote 5kg',
        new_price: 22.5,
        new_discount:
          '{ "discount_type": "DISCOUNT_VALUE", "discount_value_1": 20.50 }',
      },
      {
        id: 3,
        action: 'CREATE',
        item_id: '3',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 4640426163742,
        item_name: 'Filé de Peito de Frango Sadia Bandeja 1kg',
        new_price: 14.69,
        new_discount:
          '{ "discount_type": "DISCOUNT_PERCENT", "discount_value_1": 10 }',
      },
      {
        id: 4,
        action: 'CREATE',
        item_id: '4',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 2426547537537,
        item_name: 'Achocolatado Original Toddy Pote 200g',
        new_price: 4.25,
        new_discount: '{}',
      },
      {
        id: 5,
        action: 'CREATE',
        item_id: '5',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 3428747357514,
        item_name: 'Biscoito Rosca Coco Mabel Pacote 700g',
        new_price: 8.2,
        new_discount: '{ "discount_type": "ONE_FREE", "discount_value_1": 3 }',
      },
      {
        id: 6,
        action: 'CREATE',
        item_id: '6',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        product_code: 4278467537575,
        item_name: 'Leite Integral Italac Caixa 1l',
        new_price: 4.84,
        new_discount: '{}',
      },
    ],
    skipDuplicates: true,
  });

  // kit
  await prisma.item.createMany({
    data: [
      {
        item_id: '7',
        city_slug: 'jatai-go',
        market_id: 'market_1',
        market_price: 9.09,
        is_kit: true,
        kit_name: 'Combo café da manhã',
        discount_type: 'DISCOUNT_VALUE',
        discount_value_1: 7.09,
        kit_image_name: '7',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.item_details.createMany({
    data: [
      { id: 1, item_id: '7', city_slug: 'jatai-go', prod_id: 6, quantity: 1 },
      { id: 2, item_id: '7', city_slug: 'jatai-go', prod_id: 4, quantity: 1 },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
