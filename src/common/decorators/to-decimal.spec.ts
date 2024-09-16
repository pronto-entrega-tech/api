import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import TransformToDecimal from './to-decimal';
import { describe, expect, it } from 'vitest';

class TestClass {
  @TransformToDecimal()
  value: Prisma.Decimal;
}

describe('TransformToDecimal', () => {
  it('should return decimal', () => {
    const { value } = plainToInstance(TestClass, { value: 1 });

    expect(value).toBeInstanceOf(Prisma.Decimal);
  });
});
