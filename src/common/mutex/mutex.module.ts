import { Global, Module } from "@nestjs/common";
import { RedisModule } from "../redis/redis.module";
import { MutexService } from "./mutex.service";

@Global()
@Module({
  imports: [RedisModule],
  providers: [MutexService],
  exports: [MutexService],
})
export class MutexModule {}
