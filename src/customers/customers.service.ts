import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_IDS } from "~/auth/constants/google-client-ids";
import { Role } from "~/auth/constants/roles";
import { SessionsService } from "~/auth/sessions/sessions.service";
import { PaymentAccountsService } from "~/payments/accounts/payment-accounts.service";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { SocialProvider } from "./constants/social-providers";
import { CustomerAddressesService } from "./customer-addresses.service";
import { CustomerCardsService } from "./customer-cards.service";
import { CreateCustomerDto, CustomerWSocialDto } from "./dto/create.dto";
import { UpdateCustomerDto } from "./dto/update.dto";

@Injectable()
export class CustomersService {
  constructor(
    public readonly addresses: CustomerAddressesService,
    public readonly cards: CustomerCardsService,

    private readonly sessions: SessionsService,
    private readonly paymentAccounts: PaymentAccountsService,
    private readonly customersRepo: CustomersRepository,
  ) {}
  private readonly googleOAuth = new OAuth2Client();
  private readonly logger = new Logger(CustomersService.name);

  async create(
    email: string,
    dto: CreateCustomerDto,
    provider?: SocialProvider,
  ) {
    const { customer_id } = await this.customersRepo.create({
      ...dto,
      email,
      provider,
    });

    await this.paymentAccounts.initCreateCustomerPayer({
      customer_id,
      name: dto.name,
      email,
    });

    return this.sessions.createAndGenToken({
      sub: customer_id,
      role: Role.Customer,
    });
  }

  async socialLogin(dto: CustomerWSocialDto) {
    const { email, name } = await this.getSocialData(dto);

    const customer_id = await this.customersRepo.findId(email);

    if (!customer_id) return this.create(email, { name }, dto.provider);

    return this.sessions.createAndGenToken({
      sub: customer_id,
      role: Role.Customer,
    });
  }

  private async getSocialData(dto: CustomerWSocialDto) {
    try {
      return await this.trySocialData(dto);
    } catch (err) {
      return this.handleSocialAuthError(err);
    }
  }

  private trySocialData(dto: CustomerWSocialDto) {
    return {
      [SocialProvider.Google]: () => this.getGoogleData(dto),
    }[dto.provider]();
  }

  private handleSocialAuthError(err: unknown): never {
    this.logger.error(err);
    throw new UnauthorizedException();
  }

  private async getGoogleData(dto: CustomerWSocialDto) {
    const ticket = await this.googleOAuth.verifyIdToken({
      idToken: dto.token,
      audience: GOOGLE_CLIENT_IDS,
    });

    const { email, name } = ticket.getPayload() ?? {};
    if (!email || !name)
      throw new Error("Google social auth missing email or name");

    return { email, name };
  }

  async find(customer_id: string) {
    return this.customersRepo.findOne(customer_id);
  }

  async update(customer_id: string, dto: UpdateCustomerDto) {
    const customer = await this.customersRepo.update(customer_id, dto);

    if (dto.document && customer.asaas_id)
      await this.paymentAccounts.updateCustomerPayer({
        payer_id: customer.asaas_id,
        document: dto.document,
      });

    return customer;
  }

  async delete(customer_id: string) {
    return this.customersRepo.delete(customer_id);
  }
}
