import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { fail } from 'assert';
import { Role } from '~/auth/constants/roles';
import { SaveSessionDto, Session } from '~/auth/dto/session';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { PrismaService } from '~/common/prisma/prisma.service';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(role: Role, dto: SaveSessionDto): Promise<Session> {
    const data = Prisma.validator<Prisma.admin_sessionCreateManyInput>()(dto);

    return {
      [Role.Admin]: () => this.prisma.admin_session.create({ data }),
      [Role.Customer]: () => this.prisma.customer_session.create({ data }),
      [Role.Market]: () => this.prisma.market_session.create({ data }),
      [Role.MarketSub]: () => this.prisma.market_sub_session.create({ data }),
    }[role]();
  }

  async recreate(
    role: Role,
    session_id: string,
    dto: SaveSessionDto,
  ): Promise<Session> {
    const data = Prisma.validator<Prisma.admin_sessionCreateManyInput>()(dto);
    const where = { session_id };

    const [session] = await {
      [Role.Admin]: () =>
        this.prisma.$transaction([
          this.prisma.admin_session.create({ data }),
          this.prisma.admin_session.delete({ where }),
        ]),
      [Role.Customer]: () =>
        this.prisma.$transaction([
          this.prisma.customer_session.create({ data }),
          this.prisma.customer_session.delete({ where }),
        ]),
      [Role.Market]: () =>
        this.prisma.$transaction([
          this.prisma.market_session.create({ data }),
          this.prisma.market_session.delete({ where }),
        ]),
      [Role.MarketSub]: () =>
        this.prisma.$transaction([
          this.prisma.market_sub_session.create({ data }),
          this.prisma.market_sub_session.delete({ where }),
        ]),
    }[role]();

    return session;
  }

  async findOne(
    role: Role,
    session_id: string,
    { includeExpired = false } = {},
  ): Promise<Session | null> {
    const where = {
      session_id: session_id ?? fail('Undefined session_id founded on repo!'),
      expires_in: { gt: !includeExpired ? new Date() : undefined },
    };

    return {
      [Role.Admin]: () => this.prisma.admin_session.findFirst({ where }),
      [Role.Customer]: () => this.prisma.customer_session.findFirst({ where }),
      [Role.Market]: () => this.prisma.market_session.findFirst({ where }),
      [Role.MarketSub]: () =>
        this.prisma.market_sub_session.findFirst({ where }),
    }[role]();
  }

  async delete(role: Role, session_id: string): Promise<Session> {
    const where = { session_id };

    return {
      [Role.Admin]: () => this.prisma.admin_session.delete({ where }),
      [Role.Customer]: () => this.prisma.customer_session.delete({ where }),
      [Role.Market]: () => this.prisma.market_session.delete({ where }),
      [Role.MarketSub]: () => this.prisma.market_sub_session.delete({ where }),
    }
      [role]()
      .catch(prismaNotFound('Session'));
  }

  async deleteExpired() {
    const where = { expires_in: { lte: new Date() } };

    await this.prisma.admin_session.deleteMany({ where });
    await this.prisma.customer_session.deleteMany({ where });
    await this.prisma.market_session.deleteMany({ where });
    await this.prisma.market_sub_session.deleteMany({ where });
  }
}
