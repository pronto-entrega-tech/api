import { DynamicModule } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Argon2, { argon2id } from 'argon2';
import { KiB } from '~/common/constants/bytes-sizes';

const options = Prisma.validator<Argon2.Options>()({
  type: argon2id,
  timeCost: 12,
  memoryCost: 32 * KiB,
  parallelism: 1,
  saltLength: 16,
  hashLength: 32,
});

export class Argon2Module {
  static async forRootAsync() {
    const pseudoHash = await Argon2.hash('', options);
    const argon2Service = new Argon2Service(pseudoHash);

    return {
      module: Argon2Module,
      global: true,
      providers: [{ provide: Argon2Service, useValue: argon2Service }],
      exports: [Argon2Service],
    } as DynamicModule;
  }
}

@Injectable()
export class Argon2Service {
  constructor(private readonly pseudoHash: string) {}

  hash(plain: string | Buffer) {
    return Argon2.hash(plain, options);
  }
  verify = Argon2.verify;
  needsRehash = Argon2.needsRehash;

  /**
   * Pseudo-process to avoid "timing attack".
   */
  async pseudoVerify() {
    await this.verify(this.pseudoHash, '');
  }
}
