import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '~/auth/constants/roles';
import { SaveSessionDto, Session } from '~/auth/dto/session';
import { NotFoundError } from '~/common/errors/not-found';

@Injectable()
export class InMemorySessionsRepository {
  private sessions: {
    [x in Role]: Session[];
  } = {
    [Role.Admin]: [],
    [Role.Customer]: [],
    [Role.Market]: [],
    [Role.MarketSub]: [],
  };

  create(role: Role, dto: SaveSessionDto) {
    const { session_id, ..._dto } = dto;
    this.sessions[role].push({
      ..._dto,
      session_id: session_id ?? randomUUID(),
    });
    return this.sessions[role].at(-1);
  }

  async findOne(
    role: Role,
    session_id: string,
    options?: { includeExpired: boolean },
  ) {
    return (
      this.sessions[role].find(
        (s) =>
          s.session_id === session_id &&
          (options?.includeExpired || +s.expires_in > Date.now()),
      ) ?? null
    );
  }

  async delete(role: Role, session_id: string) {
    const i = this.sessions[role].findIndex((s) => s.session_id === session_id);
    if (i < 0) throw new NotFoundError('Session');

    return this.sessions[role].splice(i, 1)[0];
  }

  async deleteExpired() {
    Object.values(Role).forEach((role) => {
      this.sessions[role] = this.sessions[role].filter(
        (s) => +s.expires_in > Date.now(),
      );
    });
  }
}
