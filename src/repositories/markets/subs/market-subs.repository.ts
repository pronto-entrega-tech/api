import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prismaNotFound } from "~/common/prisma/handle-prisma-errors";
import { PrismaService } from "~/common/prisma/prisma.service";
import { SaveMarketSubDto } from "~/markets/dto/create-sub.dto";
import { UpdateMarketSubDto } from "~/markets/dto/update-sub.dto";

@Injectable()
export class MarketSubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(market_id: string, dto: SaveMarketSubDto) {
    const validData = Prisma.validator<Prisma.market_subCreateManyInput>();

    return this.prisma.market_sub.create({
      data: validData({ market_id, ...dto }),
    });
  }

  async findMarketId(id: string) {
    const { market_id } = await this.prisma.market_sub
      .findUniqueOrThrow({
        select: { market_id: true },
        where: { id },
      })
      .catch(prismaNotFound("Market sub-account"));
    return market_id;
  }

  async findMany(market_id: string) {
    return this.prisma.market_sub.findMany({
      select: { id: true, created_at: true, name: true, permissions: true },
      where: { market_id, deleted: false },
    });
  }

  async findOne(market_id: string, id: string) {
    return this.prisma.market_sub
      .findFirstOrThrow({
        where: { id, market_id, deleted: false },
      })
      .catch(prismaNotFound("Market sub-account"));
  }

  async findOneById(id: string) {
    return this.prisma.market_sub
      .findFirstOrThrow({
        where: { id, deleted: false },
      })
      .catch(prismaNotFound("Market sub-account"));
  }

  async update(market_id: string, id: string, dto: UpdateMarketSubDto) {
    await this.checkIfExist(market_id, id);

    const validData = Prisma.validator<Prisma.market_subUpdateInput>();

    return this.prisma.market_sub
      .update({
        data: validData(dto),
        where: { id },
      })
      .catch(prismaNotFound("Market sub-account"));
  }

  async delete(market_id: string, id: string) {
    await this.checkIfExist(market_id, id);

    return this.prisma.market_sub
      .update({
        data: { deleted: true, sessions: { deleteMany: { user_id: id } } },
        where: { id },
      })
      .catch(prismaNotFound("Market sub-account"));
  }

  private async checkIfExist(market_id: string, id: string) {
    await this.findOne(market_id, id);
  }
}
