import { OnModuleDestroy } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Mutex } from "redis-semaphore";
import { LockedAction } from "../constants/locked-actions";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class MutexService implements OnModuleDestroy {
  constructor(private readonly redis: RedisService) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async exec<T>(action: LockedAction, key: string, fn: () => Promise<T>) {
    const mutex = new Mutex(this.redis, `${action}_${key}`);

    await mutex.acquire();
    try {
      return await fn();
    } finally {
      await mutex.release();
    }
  }
}
