import { DynamicModule } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { MailerService } from './mailer.service';

export class MailerModule {
  static forRoot(p: {
    options: SMTPTransport.Options;
    defaults?: SMTPTransport.Options;
  }): DynamicModule {
    const transporter = createTransport(p.options, p.defaults);
    const mailerService = new MailerService(transporter);

    return {
      module: MailerModule,
      providers: [{ provide: MailerService, useValue: mailerService }],
      exports: [MailerService],
    };
  }
}
