import { Injectable } from '@nestjs/common';
import { products, categories } from '@prisma/client';
import { TestPropertyError } from '~/common/errors/test-property';
import { CreateProductDto } from '~/products/dto/create.dto';

@Injectable()
export class InMemoryProductsRepository {
  private readonly products = [] as products[];
  private readonly categories = [] as categories[];

  async create(dto: CreateProductDto & { prod_id?: bigint }) {
    const prod_id = dto.prod_id ?? BigInt(this.products.length + 1);
    const product = { ...dto, prod_id } as products;

    this.products.push(product);

    return product;
  }

  async findOneByCode(code: bigint) {
    return this.products.find((i) => i.code === code) ?? null;
  }

  async findIdsByCodes(prodCodes: bigint[]) {
    return this.products
      .filter((p) => prodCodes.includes(p.code ?? 0n))
      .map((p) => p.prod_id);
  }

  async createCategory(dto: { category_id: number; name: string }) {
    if (!dto.category_id) throw new TestPropertyError('category_id');
    this.categories.push(dto);
    return dto;
  }
}
