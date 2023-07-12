import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
  CreateJwtStrategy,
  AccessJwtStrategy,
  ConnectJwtStrategy,
} from './jwt.strategy';

@Module({
  imports: [PassportModule],
  providers: [CreateJwtStrategy, AccessJwtStrategy, ConnectJwtStrategy],
})
export class StrategiesModule {}
