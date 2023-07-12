import { Length } from 'class-validator';

export class CreateCategoryDto {
  @Length(1, 256)
  readonly name: string;
}
