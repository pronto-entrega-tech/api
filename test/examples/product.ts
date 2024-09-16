import { Prisma, products } from "@prisma/client";
import { CreateProductDto } from "~/products/dto/create.dto";

export const createCategory = { category_id: 1, name: "Category 1" };

export const createProduct = Prisma.validator<CreateProductDto>()({
  code: 1n,
  name: "Product Name",
  brand: "Product Brand",
  quantity: "Product Quantity",
  category_id: createCategory.category_id,
  images_names: [],
});

export const createProduct2: CreateProductDto = {
  ...createProduct,
  code: 2n,
  name: "Product Name 2",
};

export const createdProduct = Prisma.validator<products>()({
  ...createProduct,
  prod_id: 1n,
  thumbhash: null,
  ingredients: null,
  portion: null,
  nutrition_facts: null,
});
