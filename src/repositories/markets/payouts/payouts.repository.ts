import { Prisma } from '@prisma/client';
import { prismaNotFound } from '~/common/prisma/handle-prisma-errors';
import { PrismaService } from '~/common/prisma/prisma.service';
import { UpdatePayoutDto } from '~/markets/dto/update-payout';
import { Partitions } from '../partitions';

export class PayoutsRepository {
  constructor(private readonly prisma: PrismaService) {}
  private readonly partitions = new Partitions(this.prisma);

  async createMany(month: Date) {
    const markets = await this.prisma.market.findMany({
      select: { market_id: true },
      where: { email: { not: null } },
    });

    const payouts = markets.map(({ market_id }) => ({
      market_id,
      month,
    }));

    await this.prisma.$transaction([
      this.createPayoutPartition(month),
      this.prisma.market_payout.createMany({ data: payouts }),
    ]);
  }

  async exist(monthDate: Date) {
    const table = Prisma.ModelName.market_payout;
    return this.partitions.exist(table, monthDate);
  }

  async findPending(month: Date) {
    return this.prisma.market_payout.findMany({
      select: {
        amount: true,
        market: {
          select: {
            market_id: true,
            asaas_account_key: true,
            pix_key: true,
            pix_key_type: true,
            bank_account: true,
          },
        },
      },
      where: { month, is_paid: false },
    });
  }

  async findOne(market_id: string, month: Date) {
    return this.prisma.market_payout
      .findUniqueOrThrow({
        where: { market_id_month: { market_id, month } },
      })
      .catch(prismaNotFound('Payout'));
  }

  async increase(market_id: string, month: Date, amount: Prisma.Decimal.Value) {
    return this.prisma.market_payout.update({
      data: { amount: { increment: amount } },
      where: { market_id_month: { market_id, month } },
    });
  }

  async decrease(market_id: string, month: Date, amount: Prisma.Decimal.Value) {
    return this.prisma.market_payout.update({
      data: { amount: { decrement: amount } },
      where: { market_id_month: { market_id, month } },
    });
  }

  async update(market_id: string, month: Date, dto: UpdatePayoutDto) {
    const validData = Prisma.validator<Prisma.market_payoutUpdateInput>();

    return this.prisma.market_payout.update({
      data: validData(dto),
      where: { market_id_month: { market_id, month } },
    });
  }

  private createPayoutPartition(month: Date) {
    return this.partitions.createMonthly(month, Prisma.ModelName.market_payout);
  }
}
