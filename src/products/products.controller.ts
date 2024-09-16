import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ACCESS_TOKEN } from "~/auth/constants/auth-tokens";
import { Role } from "~/auth/constants/roles";
import { AccessAuthGuard } from "~/auth/guards/auth.guard";
import { Roles } from "~/auth/guards/roles.guard";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateProductDto } from "./dto/create.dto";
import { ProductsService } from "./products.service";

@ApiBearerAuth(ADMIN_ACCESS_TOKEN)
@UseGuards(AccessAuthGuard)
@Roles(Role.Admin)
@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @ApiOperation({ summary: "Create a product" })
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @ApiOperation({ summary: "Create a category" })
  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.products.createCategory(dto);
  }
}
