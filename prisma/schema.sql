CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('DISCOUNT_VALUE', 'DISCOUNT_PERCENT', 'DISCOUNT_PERCENT_ON_SECOND', 'ONE_FREE');

-- CreateEnum
CREATE TYPE "item_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "market_type" AS ENUM ('SUPERMARKET', 'PHARMACY', 'PET_SHOP', 'FAST_FOOD', 'LIQUOR_STORE');

-- CreateEnum
CREATE TYPE "pix_key_type" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP');

-- CreateEnum
CREATE TYPE "holder_type" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "bank_account_type" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "week_day" AS ENUM ('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');

-- CreateEnum
CREATE TYPE "open_flip_type" AS ENUM ('OPEN', 'CLOSE_UNTIL_NEXT_DAY', 'CLOSE_UNTIL_NEXT_OPEN');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PAYMENT_PROCESSING', 'PAYMENT_FAILED', 'PAYMENT_REQUIRE_ACTION', 'APPROVAL_PENDING', 'PROCESSING', 'DELIVERY_PENDING', 'COMPLETING', 'COMPLETED', 'CANCELING', 'CANCELED');

-- CreateEnum
CREATE TYPE "market_invoice_status" AS ENUM ('PROCESSING', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "social_provider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'PIX');

-- CreateEnum
CREATE TYPE "roles" AS ENUM ('ADMIN', 'CUSTOMER', 'MARKET', 'MARKET_SUB');

-- CreateEnum
CREATE TYPE "m_sub_permission" AS ENUM ('STOCK', 'DELIVERY');

-- CreateEnum
CREATE TYPE "chat_message_author" AS ENUM ('CUSTOMER', 'MARKET');

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SMALLSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "products" (
    "prod_id" BIGSERIAL NOT NULL,
    "code" BIGINT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "quantity" TEXT,
    "category_id" SMALLINT NOT NULL,
    "thumbhash" TEXT,
    "images_names" TEXT[],
    "ingredients" TEXT,
    "portion" TEXT,
    "nutrition_facts" JSONB,
    "ts" tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', name)||to_tsvector('portuguese', brand)) STORED,

    CONSTRAINT "products_pkey" PRIMARY KEY ("prod_id")
);

-- CreateTable
CREATE TABLE "item" (
    "item_id" TEXT NOT NULL,
    "city_slug" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "prod_id" BIGINT,
    "market_price" DECIMAL(7,2) NOT NULL,
    "stock" INTEGER,
    "unit_weight" DECIMAL(5,3),
    "is_kit" BOOLEAN NOT NULL DEFAULT false,
    "kit_name" TEXT,
    "kit_quantity" TEXT,
    "kit_image_name" TEXT,
    "discount_type" "discount_type",
    "discount_value_1" DECIMAL(7,2),
    "discount_value_2" SMALLINT,
    "discount_max_per_client" SMALLINT,

    CONSTRAINT "item_pkey" PRIMARY KEY ("item_id","city_slug")
) PARTITION BY LIST ("city_slug");

-- CreateTable
CREATE TABLE "item_details" (
    "id" BIGSERIAL NOT NULL,
    "item_id" TEXT NOT NULL,
    "city_slug" TEXT NOT NULL,
    "prod_id" BIGINT NOT NULL,
    "quantity" DECIMAL(5,3) NOT NULL,

    CONSTRAINT "item_details_pkey" PRIMARY KEY ("id","city_slug")
) PARTITION BY LIST ("city_slug");

-- CreateTable
CREATE TABLE "item_activity" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "market_sub_id" TEXT,
    "item_id" TEXT,
    "city_slug" TEXT,
    "product_code" BIGINT,
    "item_name" TEXT NOT NULL,
    "action" "item_action" NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "new_price" DECIMAL(7,2),
    "new_stock" INTEGER,
    "new_unit_weight" DECIMAL(5,3),
    "new_discount" JSONB,
    "new_details" JSONB[],

    CONSTRAINT "item_activity_pkey" PRIMARY KEY ("id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "admin" (
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" CITEXT NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" CITEXT,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "asaas_id" TEXT,
    "debit" DECIMAL(7,2),
    "social_provider" "social_provider",

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "customer_address" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "nickname" TEXT,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "complement" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "customer_address_pkey" PRIMARY KEY ("id","customer_id")
);

-- CreateTable
CREATE TABLE "customer_card" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "nickname" TEXT,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "asaas_id" TEXT NOT NULL,

    CONSTRAINT "customer_card_pkey" PRIMARY KEY ("id","customer_id")
);

-- CreateTable
CREATE TABLE "market" (
    "market_id" TEXT NOT NULL,
    "city_slug" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "in_debt" BOOLEAN NOT NULL DEFAULT false,
    "type" "market_type" NOT NULL,
    "name" TEXT NOT NULL,
    "thumbhash" TEXT,
    "address_street" TEXT NOT NULL,
    "address_number" TEXT NOT NULL,
    "address_district" TEXT NOT NULL,
    "address_city" TEXT NOT NULL,
    "address_state" TEXT NOT NULL,
    "address_complement" TEXT,
    "address_latitude" DOUBLE PRECISION NOT NULL,
    "address_longitude" DOUBLE PRECISION NOT NULL,
    "location" geometry GENERATED ALWAYS AS (ST_POINT(address_longitude, address_latitude)) STORED,
    "order_min" DECIMAL(5,2) NOT NULL,
    "delivery_fee" DECIMAL(4,2) NOT NULL,
    "markup" DECIMAL(4,2) NOT NULL,
    "min_time" DECIMAL(3,0) NOT NULL,
    "max_time" DECIMAL(3,0) NOT NULL,
    "schedule_mins_interval" SMALLINT,
    "schedule_max_days" SMALLINT,
    "rating" DECIMAL(2,1),
    "reviews_count_lately" INTEGER,
    "reviews_count_total" BIGINT,
    "info" TEXT,
    "document" TEXT NOT NULL,
    "payments_accepted" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" CITEXT,
    "pix_key" TEXT,
    "pix_key_type" "pix_key_type",
    "asaas_customer_id" TEXT,
    "asaas_account_id" TEXT,
    "asaas_account_key" TEXT,

    CONSTRAINT "market_pkey" PRIMARY KEY ("market_id")
);

-- CreateTable
CREATE TABLE "bank_account" (
    "market_id" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "holder_type" "holder_type" NOT NULL,
    "bank_number" TEXT NOT NULL,
    "agency_number" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "type" "bank_account_type" NOT NULL,
    "document" TEXT NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("market_id")
);

-- CreateTable
CREATE TABLE "business_hour" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "days" "week_day"[],
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,

    CONSTRAINT "business_hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_day" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason_code" SMALLINT NOT NULL,
    "reason_name" TEXT NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,

    CONSTRAINT "special_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_flip" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "open_flip_type" NOT NULL,

    CONSTRAINT "open_flip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_invoice" (
    "id" BIGSERIAL NOT NULL,
    "month" DATE NOT NULL,
    "market_id" TEXT NOT NULL,
    "status" "market_invoice_status" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(7,2) NOT NULL,
    "payment_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "boleto_code" TEXT,
    "boleto_pdf_url" TEXT,
    "boleto_expires_at" TIMESTAMPTZ(6),
    "pix_code" TEXT,
    "pix_expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "market_invoice_pkey" PRIMARY KEY ("id","month")
) PARTITION BY LIST ("month");

-- CreateTable
CREATE TABLE "market_payout" (
    "id" BIGSERIAL NOT NULL,
    "month" DATE NOT NULL,
    "market_id" TEXT NOT NULL,
    "amount" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "payment_id" TEXT,

    CONSTRAINT "market_payout_pkey" PRIMARY KEY ("id","month")
) PARTITION BY LIST ("month");

-- CreateTable
CREATE TABLE "market_sub" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "permissions" "m_sub_permission"[],

    CONSTRAINT "market_sub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "otp_id" UUID NOT NULL,
    "otp" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "roles" NOT NULL,
    "expires_in" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("otp_id")
);

-- CreateTable
CREATE TABLE "admin_session" (
    "session_id" UUID NOT NULL,
    "expires_in" TIMESTAMPTZ(6) NOT NULL,
    "admin_id" TEXT NOT NULL,

    CONSTRAINT "admin_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "customer_session" (
    "session_id" UUID NOT NULL,
    "expires_in" TIMESTAMPTZ(6) NOT NULL,
    "customer_id" TEXT NOT NULL,

    CONSTRAINT "customer_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "market_session" (
    "session_id" UUID NOT NULL,
    "expires_in" TIMESTAMPTZ(6) NOT NULL,
    "market_id" TEXT NOT NULL,

    CONSTRAINT "market_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "market_sub_session" (
    "session_id" UUID NOT NULL,
    "expires_in" TIMESTAMPTZ(6) NOT NULL,
    "market_sub_id" TEXT NOT NULL,

    CONSTRAINT "market_sub_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "market_order_id" BIGINT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" "order_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "delivery_min_time" TIMESTAMPTZ(6) NOT NULL,
    "delivery_max_time" TIMESTAMPTZ(6) NOT NULL,
    "delivery_fee" DECIMAL(7,2) NOT NULL,
    "total" DECIMAL(7,2) NOT NULL,
    "market_amount" DECIMAL(7,2) NOT NULL,
    "customer_debit" DECIMAL(7,2),
    "credit_used" DECIMAL(7,2),
    "debit_amount" DECIMAL(7,2),
    "debit_market_id" TEXT,
    "ip" TEXT,
    "is_scheduled" BOOLEAN NOT NULL,
    "paid_in_app" BOOLEAN NOT NULL,
    "payment_id" TEXT,
    "payment_method" "payment_method" NOT NULL,
    "payment_description" TEXT NOT NULL,
    "payment_change" DECIMAL(7,2),
    "card_token" TEXT,
    "pix_code" TEXT,
    "pix_expires_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "cancel_message" TEXT,
    "address_street" TEXT NOT NULL,
    "address_number" TEXT NOT NULL,
    "address_district" TEXT NOT NULL,
    "address_city" TEXT NOT NULL,
    "address_state" TEXT NOT NULL,
    "address_complement" TEXT,
    "address_latitude" DOUBLE PRECISION NOT NULL,
    "address_longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "order_item" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "prod_id" BIGINT,
    "quantity" DECIMAL(5,3) NOT NULL,
    "price" DECIMAL(7,2) NOT NULL,
    "is_kit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "order_item_details" (
    "id" BIGSERIAL NOT NULL,
    "market_id" TEXT NOT NULL,
    "order_item_id" BIGINT NOT NULL,
    "prod_id" BIGINT NOT NULL,
    "quantity" DECIMAL(5,3) NOT NULL,

    CONSTRAINT "order_item_details_pkey" PRIMARY KEY ("id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "order_missing_item" (
    "order_item_id" BIGINT NOT NULL,
    "market_id" TEXT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "quantity" DECIMAL(5,3) NOT NULL,

    CONSTRAINT "order_missing_item_pkey" PRIMARY KEY ("order_item_id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "review" (
    "market_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" SMALLINT NOT NULL,
    "complaint" TEXT[],
    "message" TEXT,
    "response" TEXT,

    CONSTRAINT "review_pkey" PRIMARY KEY ("order_id","market_id")
) PARTITION BY LIST ("market_id");

-- CreateTable
CREATE TABLE "chat_message" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "order_id" BIGINT NOT NULL,
    "market_order_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" "chat_message_author" NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id","customer_id")
) PARTITION BY LIST ("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_ts_idx" ON "products" USING GIN ("ts");

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_key" ON "customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "market_email_key" ON "market"("email");

-- CreateIndex
CREATE INDEX "market_location_idx" ON "market" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "market_invoice_market_id_month_key" ON "market_invoice"("market_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "market_payout_market_id_month_key" ON "market_payout"("market_id", "month");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_prod_id_fkey" FOREIGN KEY ("prod_id") REFERENCES "products"("prod_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_item_id_city_slug_fkey" FOREIGN KEY ("item_id", "city_slug") REFERENCES "item"("item_id", "city_slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_details" ADD CONSTRAINT "item_details_prod_id_fkey" FOREIGN KEY ("prod_id") REFERENCES "products"("prod_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_activity" ADD CONSTRAINT "item_activity_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_activity" ADD CONSTRAINT "item_activity_market_sub_id_fkey" FOREIGN KEY ("market_sub_id") REFERENCES "market_sub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_activity" ADD CONSTRAINT "item_activity_item_id_city_slug_fkey" FOREIGN KEY ("item_id", "city_slug") REFERENCES "item"("item_id", "city_slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_card" ADD CONSTRAINT "customer_card_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hour" ADD CONSTRAINT "business_hour_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_day" ADD CONSTRAINT "special_day_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_flip" ADD CONSTRAINT "open_flip_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_invoice" ADD CONSTRAINT "market_invoice_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_payout" ADD CONSTRAINT "market_payout_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_sub" ADD CONSTRAINT "market_sub_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("admin_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_session" ADD CONSTRAINT "customer_session_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_session" ADD CONSTRAINT "market_session_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_sub_session" ADD CONSTRAINT "market_sub_session_market_sub_id_fkey" FOREIGN KEY ("market_sub_id") REFERENCES "market_sub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_debit_market_id_fkey" FOREIGN KEY ("debit_market_id") REFERENCES "market"("market_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_market_id_fkey" FOREIGN KEY ("order_id", "market_id") REFERENCES "orders"("order_id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_prod_id_fkey" FOREIGN KEY ("prod_id") REFERENCES "products"("prod_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_details" ADD CONSTRAINT "order_item_details_order_item_id_market_id_fkey" FOREIGN KEY ("order_item_id", "market_id") REFERENCES "order_item"("id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_details" ADD CONSTRAINT "order_item_details_prod_id_fkey" FOREIGN KEY ("prod_id") REFERENCES "products"("prod_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_missing_item" ADD CONSTRAINT "order_missing_item_order_item_id_market_id_fkey" FOREIGN KEY ("order_item_id", "market_id") REFERENCES "order_item"("id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_missing_item" ADD CONSTRAINT "order_missing_item_order_id_market_id_fkey" FOREIGN KEY ("order_id", "market_id") REFERENCES "orders"("order_id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_market_id_fkey" FOREIGN KEY ("order_id", "market_id") REFERENCES "orders"("order_id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "market"("market_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_order_id_market_id_fkey" FOREIGN KEY ("order_id", "market_id") REFERENCES "orders"("order_id", "market_id") ON DELETE CASCADE ON UPDATE CASCADE;
