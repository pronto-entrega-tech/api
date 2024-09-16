import { Injectable } from "@nestjs/common";
import { Transporter } from "nodemailer";
import Mail from "nodemailer/lib/mailer";

@Injectable()
export class MailerService {
  constructor(private readonly transporter: Transporter) {}

  sendMail(options: Mail.Options) {
    return this.transporter.sendMail(options);
  }
}
