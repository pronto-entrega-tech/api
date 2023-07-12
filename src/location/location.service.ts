import { Injectable } from '@nestjs/common';
import { fail } from 'assert';
import {
  AddressFromCoordsDto,
  AddressFromDocumentDto,
  AddressRes,
} from './dto/address.dto';
import { CoordsDto, CoordsRes } from './dto/coords.dto';
import * as GMaps from '@googlemaps/google-maps-services-js';
import { MarketsRepository } from '~/repositories/markets/markets.repository';
import { OmitType } from '@nestjs/mapped-types';
import { NotFoundError } from '~/common/errors/not-found';
import { BrasilApi } from '~/common/brasil-api/brasil-api';

class AddressWoNumberRes extends OmitType(AddressRes, ['number']) {}

@Injectable()
export class LocationService {
  constructor(private readonly marketsRepo: MarketsRepository) {}

  private readonly API_KEY =
    process.env.GOOGLE_MAPS_API_KEY ??
    fail('GOOGLE_MAPS_API_KEY must be defined');

  private readonly googlemaps = new GMaps.Client();

  async addressFromCoords({ coords }: AddressFromCoordsDto) {
    const { data } = await this.googlemaps.reverseGeocode({
      params: { key: this.API_KEY, latlng: coords },
    });
    const result = data.results[0] ?? fail(new NotFoundError('Location'));

    return this.formateAddress(result.address_components);
  }

  private formateAddress(components: GMaps.AddressComponent[]) {
    return components.reduce(
      (previous, address) => ({ ...previous, ...this.getProperty(address) }),
      {} as AddressRes,
    );
  }

  private getProperty(address: GMaps.AddressComponent) {
    const namesMap = {
      street: 'route',
      number: 'street_number',
      district: 'sublocality',
      state: 'administrative_area_level_1',
      city: 'administrative_area_level_2',
    };

    return Object.entries(namesMap).reduce(
      (previous, [name, rawName]) =>
        address.types.includes(rawName as any)
          ? { [name]: address.short_name }
          : previous,
      {} as AddressRes,
    );
  }

  async addressFromDocument({ document }: AddressFromDocumentDto) {
    const doc = await this.marketsRepo.documentData(document);

    const address = await this.addressWoNumber(doc.address.postalCode);

    return { ...address, number: doc.address.number } as AddressRes;
  }

  private async addressWoNumber(postalCode: string) {
    const data = await BrasilApi.cep(postalCode);

    const res: AddressWoNumberRes = {
      street: data.street,
      district: data.neighborhood,
      city: data.city,
      state: data.state,
    };
    return res;
  }

  async coords({ address }: CoordsDto) {
    const { data } = await this.googlemaps.geocode({
      params: { key: this.API_KEY, address },
    });
    const result = data.results[0] ?? fail(new NotFoundError('Location'));

    return result.geometry.location as CoordsRes;
  }
}
