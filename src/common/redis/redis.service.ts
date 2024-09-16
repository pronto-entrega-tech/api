import { OnModuleDestroy } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { isTest } from "../constants/is-dev";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  async onModuleDestroy() {
    if (!isTest) await this.quit();
  }
}
