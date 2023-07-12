import { Injectable } from '@nestjs/common';
import { market_sub } from '@prisma/client';
import { NotFoundError } from '~/common/errors/not-found';
import { TestPropertyError } from '~/common/errors/test-property';
import { SaveMarketSubDto } from '~/markets/dto/create-sub.dto';
import { UpdateMarketSubDto } from '~/markets/dto/update-sub.dto';

@Injectable()
export class InMemoryMarketSubsRepository {
  readonly marketSubs = [] as market_sub[];

  async create(market_id: string, dto: SaveMarketSubDto) {
    if (!dto.id) throw new TestPropertyError('marker sub id');

    return this.marketSubs.push({
      ...dto,
      id: dto.id,
      market_id,
      created_at: new Date(),
      deleted: false,
    });
  }

  async findMarketId(id: string) {
    const { market_id } = this.marketSubs.find((s) => s.id === id) ?? {};
    if (!market_id) throw new NotFoundError('Market sub-account');

    return market_id;
  }

  async findMany(market_id: string) {
    return this.marketSubs.filter(
      (s) => s.market_id === market_id && !s.deleted,
    );
  }

  async findOne(market_id: string, id: string) {
    const sub = this.marketSubs.find((s) => s.id === id);
    if (sub?.market_id !== market_id || sub?.deleted)
      throw new NotFoundError('Market sub-account');

    return sub;
  }

  async update(market_id: string, id: string, dto: UpdateMarketSubDto) {
    const i = this.marketSubs.findIndex(
      (s) => s.id === id && s.market_id === market_id && !s.deleted,
    );
    if (i < 0) throw new NotFoundError('Market sub-account');

    return (this.marketSubs[i] = { ...this.marketSubs[i], ...dto });
  }

  async delete(market_id: string, id: string) {
    const i = this.marketSubs.findIndex(
      (s) => s.id === id && s.market_id === market_id && !s.deleted,
    );
    if (i < 0) throw new NotFoundError('Market sub-account');

    return this.marketSubs.splice(i, 1)[0];
  }
}
