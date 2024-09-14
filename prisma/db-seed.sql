INSERT INTO admin (admin_id, email) VALUES
  ('4fe23218-ec82-40a9-b73c-9a5acae11616', 'leonardofc2002@gmail.com'),
  ('2f9bca0f-be4e-4905-a5b7-13bdd0001100', 'contato@prontoentrega.com.br');

CREATE TABLE item_jatai_go PARTITION OF item FOR VALUES IN ('jatai-go');
CREATE TABLE item_details_jatai_go PARTITION OF item_details FOR VALUES IN ('jatai-go');

INSERT INTO categories (name) VALUES
  ('Alimentos básicos'),
  ('Bebidas'),
  ('Bebidas alcoólicas'),
  ('Laticínios'),
  ('Biscoitos e salgadinho'),
  ('Doces e sobremesas'),
  ('Açougue e peixaria'),
  ('Congelados'),
  ('Padaria'),
  ('Queijos e frios'),
  ('Hortifrúti'),
  ('Higiene e cosméticos'),
  ('Limpeza');

INSERT INTO market (market_id, city_slug, approved, type, name, thumbhash, address_street, address_number, address_district, address_city, address_state, address_latitude, address_longitude, min_time, max_time, delivery_fee, order_min, document, payments_accepted, email, markup) VALUES
  ('market_1', 'jatai-go', true, 'SUPERMARKET', 'Garenjo', '3loHDwYniJiHeHiAfJd36EeGg4332HgP', 'Rua Itaruma','355','Setor Santa Maria','Jataí','GO', '-17.887342', '-51.725129', 40, 50, 5, 20, '12345678000103', ARRAY['Dinheiro','Pix','Crédito Mastercard','Crédito Visa'], 'contato@prontoentrega.com.br', 14.12),
  ('market_2', 'jatai-go', true, 'SUPERMARKET', 'Touros Mercado', 'URgOBwAoh4iHd3hwjId3yViHho3313gP', 'Rua Itaruma','355','Setor Santa Maria','Jataí','GO', '-17.887342', '-51.725129', 40, 50, 5, 20, '12345678000103', ARRAY['Dinheiro','Pix','Crédito Mastercard','Crédito Visa'], 'contato2@prontoentrega.com.br', 14.12),
  ('market_3', 'jatai-go', true, 'SUPERMARKET', 'Jaré da Maré', 'F9gEBwQHyHeHd4iAfYR3uFeGh3/nB4cA', 'Rua Itaruma','355','Setor Santa Maria','Jataí','GO', '-17.887342', '-51.725129', 40, 50, 5, 20, '12345678000103', ARRAY['Dinheiro','Pix','Crédito Mastercard','Crédito Visa'], 'contato3@prontoentrega.com.br', 14.12);

/* INSERT INTO bank_account (market_id, holder_name, holder_type, bank_number, agency_number, account_number, document, type) VALUES
  ('market_1', 'ProntoEntrega', 'COMPANY', '001', '0001', '12345678', '123456789', 'CHECKING'); */

CREATE TABLE item_activity_market_1 PARTITION OF item_activity FOR VALUES IN ('market_1');
CREATE TABLE orders_market_1 PARTITION OF orders FOR VALUES IN ('market_1');
CREATE TABLE order_item_market_1 PARTITION OF order_item FOR VALUES IN ('market_1');
CREATE TABLE order_item_details_market_1 PARTITION OF order_item_details FOR VALUES IN ('market_1');
CREATE TABLE order_missing_item_market_1 PARTITION OF order_missing_item FOR VALUES IN ('market_1');
CREATE TABLE review_market_1 PARTITION OF review FOR VALUES IN ('market_1');

INSERT INTO business_hour (market_id, days, open_time, close_time) VALUES
  ('market_1', ARRAY['SUN','MON','TUE','WED','THU','FRI','SAT']::week_day[], '10:00', '22:00');

INSERT INTO products (prod_id, code, name, brand, quantity, category_id, images_names) VALUES
  (1, 5463746174537, 'Refrigerante Original', 'Coca-Cola', 'Garrafa 2l', 2, ARRAY['1']),
  (2, 2416420975375, 'Arroz Branco', 'Cristal', 'Pacote 5kg', 1, ARRAY['2']),
  (3, 4640426163742, 'Filé de Peito de Frango', 'Sadia', 'Bandeja 1kg', 8, ARRAY['3']),
  (4, 2426547537537, 'Achocolatado Original', 'Toddy', 'Pote 200g', 6, ARRAY['4']),
  (5, 3428747357514, 'Biscoito Rosca Coco', 'Mabel', 'Pacote 700g', 5, ARRAY['5']),
  (6, 4278467537575, 'Leite Integral', 'Italac', 'Caixa 1l', 4, ARRAY['6']);

INSERT INTO item (item_id, city_slug, market_id, prod_id, market_price, discount_type, discount_value_1, discount_value_2) VALUES
  ('1', 'jatai-go', 'market_1', 1, 5, 'DISCOUNT_PERCENT_ON_SECOND', 20, null),
  ('2', 'jatai-go', 'market_1', 2, 22.50, 'DISCOUNT_VALUE', 20.50, null),
  ('3', 'jatai-go', 'market_1', 3, 14.69, 'DISCOUNT_PERCENT', 10, null),
  ('4', 'jatai-go', 'market_1', 4, 4.25, null, null, null),
  ('5', 'jatai-go', 'market_1', 5, 8.20, 'ONE_FREE', 3, null),
  ('6', 'jatai-go', 'market_1', 6, 4.84, null, null, null);

INSERT INTO item_activity (action, item_id, city_slug, market_id, product_code, item_name, new_price, new_discount) VALUES
  ('CREATE', '1', 'jatai-go', 'market_1', 5463746174537, 'Refrigerante Original Coca-Cola Garrafa 2l', 5, '{ "discount_type": "DISCOUNT_PERCENT_ON_SECOND", "discount_value_1": 20 }'),
  ('CREATE', '2', 'jatai-go', 'market_1', 2416420975375, 'Arroz Branco Cristal Pacote 5kg', 22.50, '{ "discount_type": "DISCOUNT_VALUE", "discount_value_1": 20.50 }'),
  ('CREATE', '3', 'jatai-go', 'market_1', 4640426163742, 'Filé de Peito de Frango Sadia Bandeja 1kg', 14.69, '{ "discount_type": "DISCOUNT_PERCENT", "discount_value_1": 10 }'),
  ('CREATE', '4', 'jatai-go', 'market_1', 2426547537537, 'Achocolatado Original Toddy Pote 200g', 4.25, '{}'),
  ('CREATE', '5', 'jatai-go', 'market_1', 3428747357514, 'Biscoito Rosca Coco Mabel Pacote 700g', 8.20, '{ "discount_type": "ONE_FREE", "discount_value_1": 3 }'),
  ('CREATE', '6', 'jatai-go', 'market_1', 4278467537575, 'Leite Integral Italac Caixa 1l', 4.84, '{}');

-- kit
INSERT INTO item (item_id, city_slug, market_id, market_price, is_kit, kit_name, discount_type, discount_value_1, kit_image_name) VALUES
  ('7','jatai-go', 'market_1', 9.09, true, 'Combo café da manhã', 'DISCOUNT_VALUE', 7.09, '7');
INSERT INTO item_details (item_id, city_slug, prod_id, quantity) VALUES
  ('7','jatai-go', 6, 1),
  ('7','jatai-go', 4, 1);