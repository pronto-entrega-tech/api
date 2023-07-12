import { Module } from '@nestjs/common';
import { FakeMutexService } from './fake-mutex.service';
import { MutexService } from './mutex.service';

@Module({
  providers: [{ provide: MutexService, useClass: FakeMutexService }],
  exports: [MutexService],
})
export class FakeMutexModule {}
