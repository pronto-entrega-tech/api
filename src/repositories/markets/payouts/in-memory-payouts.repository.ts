import { bank_account, market, market_payout } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { NotFoundError } from '~/common/errors/not-found';
import { UpdatePayoutDto } from '~/markets/dto/update-payout';

export class InMemoryPayoutsRepository {
  constructor(
    private readonly markets: market[],
    private readonly bankAccounts: Map<string, bank_account>,
  ) {}
  private readonly payouts = [] as market_payout[];

  create(market_id: string, month: Date) {
    this.payouts.push({
      id: BigInt(this.payouts.length + 1),
      month,
      market_id,
      amount: new Decimal(0),
      is_paid: false,
      paid_at: null,
      payment_id: null,
    });
  }

  createMany(month: Date) {
    this.markets.forEach(({ market_id }) => this.create(market_id, month));
  }

  async exist(month: Date) {
    return !!this.payouts.find((p) => +p.month === +month);
  }

  async findPending(month: Date) {
    const filtered = this.payouts.filter(
      (p) => +p.month === +month && p.is_paid === false,
    );
    return filtered.map((p) => ({
      amount: p.amount,
      market: {
        market_id: p.market_id,
        bank_account: this.bankAccounts.get(p.market_id),
      },
    }));
  }

  async findOne(market_id: string, month: Date) {
    const payout = this.payouts.find(
      (p) => p.market_id === market_id && +p.month === +month,
    );
    if (!payout) throw new NotFoundError('Payout');

    return payout;
  }

  async increase(market_id: string, month: Date, amount: Decimal.Value) {
    const i = this.payouts.findIndex(
      (v) => v.market_id === market_id && +v.month === +month,
    );
    if (i < 0) throw new NotFoundError('Payout');

    this.payouts[i] = {
      ...this.payouts[i],
      amount: this.payouts[i].amount.plus(amount),
    };
    return this.payouts[i];
  }

  async decrease(market_id: string, month: Date, amount: Decimal.Value) {
    const i = this.payouts.findIndex(
      (v) => v.market_id === market_id && +v.month === +month,
    );
    if (i < 0) throw new NotFoundError('Payout');

    this.payouts[i] = {
      ...this.payouts[i],
      amount: this.payouts[i].amount.minus(amount),
    };
    return this.payouts[i];
  }

  async update(
    market_id: string,
    month: Date,
    dto: UpdatePayoutDto,
  ): Promise<market_payout> {
    const i = this.payouts.findIndex(
      (v) => v.market_id === market_id && +v.month === +month,
    );
    if (i < 0) throw new NotFoundError('Payout');

    const { amount, ..._dto } = dto;
    this.payouts[i] = {
      ...this.payouts[i],
      ..._dto,
      ...(amount ? { amount: new Decimal(amount) } : {}),
    };
    return this.payouts[i];
  }
}
