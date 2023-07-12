import { Decimal } from '@prisma/client/runtime';
import { plainToInstance } from 'class-transformer';
import TransformToDecimal from './to-decimal';

class TestClass {
  @TransformToDecimal()
  value: Decimal;
}

describe('TransformToDecimal', () => {
  it('should return decimal', () => {
    const { value } = plainToInstance(TestClass, { value: '1' });

    expect(value).toBeInstanceOf(Decimal);
  });
});
