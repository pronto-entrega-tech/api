import { Decimal } from '@prisma/client/runtime';
import { plainToInstance } from 'class-transformer';
import TransformToDecimal from './to-decimal';
import { describe, expect, it } from 'vitest';

class TestClass {
  @TransformToDecimal()
  value: Decimal;
}

describe('TransformToDecimal', () => {
  it('should return decimal', () => {
    const { value } = plainToInstance(TestClass, { value: 1 });

    expect(value).toBeInstanceOf(Decimal);
  });
});
