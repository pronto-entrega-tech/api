import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envPath } from '~/common/functions/env-path';
import { MailerModule } from '~/common/mailer/mailer.module';
import { Argon2Module } from './argon2.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsModule } from './sessions/sessions.module';
import { StrategiesModule } from './strategies/strategies.module';

@Module({
  imports: [
    SessionsModule,
    StrategiesModule,
    ConfigModule.forRoot({
      envFilePath: envPath(),
    }),
    Argon2Module.forRootAsync(),
    MailerModule.forRoot({
      options: {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.LOGIN_EMAIL_ADDRESS,
          pass: process.env.LOGIN_EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: `ProntoEntrega ${process.env.LOGIN_EMAIL_ADDRESS}`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
