import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create.dto';
import { ProductsRepository } from '~/repositories/products/products.repository';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepo: ProductsRepository) {}

  create(dto: CreateProductDto) {
    return this.productsRepo.create(dto);
  }

  findOneByCode(code: bigint) {
    return this.productsRepo.findOneByCode(code);
  }

  createCategory(dto: CreateCategoryDto) {
    return this.productsRepo.createCategory(dto);
  }
}
