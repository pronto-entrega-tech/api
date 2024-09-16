import { ApiProperty } from "@nestjs/swagger";
import { IsLatLong, Length } from "class-validator";

export class AddressFromCoordsDto {
  @ApiProperty({ example: "latitude,longitude" })
  @IsLatLong()
  readonly coords: string;
}

export class AddressFromDocumentDto {
  @ApiProperty({ example: "12345678000001" })
  @Length(14, 14)
  readonly document: string;
}

export class AddressRes {
  readonly street?: string;
  readonly number?: string;
  readonly district?: string;
  readonly city?: string;
  readonly state?: string;
}
