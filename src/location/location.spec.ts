import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { LocationService } from './location.service';

let locations: LocationService;

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [LocationService, { provide: HttpService, useValue: null }],
  }).compile();

  locations = module.get(LocationService);
});

it('is defined', () => {
  expect(locations).toBeDefined();
});
