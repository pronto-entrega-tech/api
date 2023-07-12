import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { envPath } from '~/common/functions/env-path';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: envPath(),
    }),
    JwtModule.register({
      secret: process.env.TOKEN_SECRET,
    }),
  ],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
