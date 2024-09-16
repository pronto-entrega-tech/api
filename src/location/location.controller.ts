import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  AddressFromCoordsDto,
  AddressFromDocumentDto,
} from "./dto/address.dto";
import { CoordsDto } from "./dto/coords.dto";
import { LocationService } from "./location.service";

@ApiTags("Location")
@Controller("location")
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @ApiOperation({ summary: "Find address using coordinates" })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get("address/from-coords/:coords")
  addressFromCoords(@Param() params: AddressFromCoordsDto) {
    return this.location.addressFromCoords(params);
  }

  @ApiOperation({ summary: "Find address using company document" })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get("address/from-document/:document")
  addressFromDocument(@Param() params: AddressFromDocumentDto) {
    return this.location.addressFromDocument(params);
  }

  @ApiOperation({ summary: "Find coordinates using address" })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get("coords/from-address/:address")
  coords(@Param() params: CoordsDto) {
    return this.location.coords(params);
  }
}
