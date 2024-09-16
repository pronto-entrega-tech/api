import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "~/common/prisma/prisma.service";
import { CreateCategoryDto } from "~/products/dto/create-category.dto";
import { CreateProductDto } from "~/products/dto/create.dto";

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const validData = Prisma.validator<Prisma.productsCreateManyInput>();

    return this.prisma.products.create({ data: validData(dto) });
  }

  async findOneByCode(code: bigint) {
    return this.prisma.products.findUnique({
      select: { prod_id: true, name: true, brand: true, quantity: true },
      where: { code },
    });
  }

  async findIdsByCodes(codes: bigint[]) {
    const prods = await this.prisma.products.findMany({
      select: { prod_id: true },
      where: { code: { in: codes } },
    });
    return prods.map((p) => p.prod_id);
  }

  async createCategory(dto: CreateCategoryDto & { category_id?: number }) {
    const validData = Prisma.validator<Prisma.categoriesCreateManyInput>();

    return this.prisma.categories.create({ data: validData(dto) });
  }
}
