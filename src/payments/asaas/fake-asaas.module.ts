import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';
import { FakeAsaasService } from './fake-asaas.service';

@Module({
  providers: [{ provide: AsaasService, useClass: FakeAsaasService }],
  exports: [AsaasService],
})
export class FakeAsaasModule {}
