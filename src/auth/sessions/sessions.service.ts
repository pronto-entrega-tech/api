import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionsRepository } from '~/repositories/sessions/sessions.repository';
import { AuthToken } from '../constants/auth-tokens';
import { CreateJwtPayload, JwtPayload } from '../constants/jwt-payload';
import { Role } from '../constants/roles';

@Injectable()
export class SessionsService {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessionsRepo: SessionsRepository,
  ) {}
  private readonly sessionValidDays = 15;
  private getExpiresIn() {
    return new Date(Date.now() + this.sessionValidDays * 24 * 60 * 60 * 1000);
  }

  async create(user_id: string, role: Role) {
    const expires_in = this.getExpiresIn();

    const { session_id } = await this.sessionsRepo.create(role, {
      user_id,
      expires_in,
    });

    return { refresh_token: session_id, expires_in };
  }

  async recreate(user_id: string, role: Role, token: string) {
    const expires_in = this.getExpiresIn();

    const { session_id } = await this.sessionsRepo.recreate(role, token, {
      user_id,
      expires_in,
    });

    return { refresh_token: session_id, expires_in };
  }

  async genToken(dto: CreateJwtPayload) {
    const payload: JwtPayload = {
      iss: 'ProntoEntrega',
      type: AuthToken.Access,
      ...dto,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: payload.type === AuthToken.Create ? '1d' : '15m',
    });
  }

  async createAndGenToken(dto: CreateJwtPayload) {
    const [session, access_token] = await Promise.all([
      this.create(dto.sub, dto.role),
      this.genToken(dto),
    ]);
    return { ...session, access_token };
  }

  async recreateAndGenToken(token: string, dto: CreateJwtPayload) {
    const [session, access_token] = await Promise.all([
      this.recreate(dto.sub, dto.role, token),
      this.genToken(dto),
    ]);
    return { ...session, access_token };
  }
}
