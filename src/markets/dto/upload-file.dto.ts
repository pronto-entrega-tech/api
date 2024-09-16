import { ApiProperty } from "@nestjs/swagger";

export class UploadFileDto {
  @ApiProperty({ format: "binary" })
  readonly picture: string;
}
