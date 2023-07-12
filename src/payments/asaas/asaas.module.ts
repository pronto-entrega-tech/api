import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AsaasService } from './asaas.service';

@Module({
  imports: [HttpModule],
  providers: [AsaasService],
  exports: [AsaasService],
})
export class AsaasModule {}
