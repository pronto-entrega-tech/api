import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { LocationService } from './location.service';
import { beforeEach, expect, it } from 'vitest';

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
