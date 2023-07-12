import { Injectable } from '@nestjs/common';
import { LockedAction } from '../constants/locked-actions';

@Injectable()
export class FakeMutexService {
  async exec(_action: LockedAction, _key: string, fn: () => Promise<void>) {
    return fn();
  }
}
