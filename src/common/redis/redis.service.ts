import { OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.quit();
  }
}
