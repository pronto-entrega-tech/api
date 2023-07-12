import { plainToInstance } from 'class-transformer';
import TransformToBigInt from './to-bigint';

class TestClass {
  @TransformToBigInt()
  value: bigint;
}

describe('TransformToBigInt', () => {
  it('should return bigint', () => {
    const { value } = plainToInstance(TestClass, { value: '1' });

    expect(typeof value).toEqual('bigint');
  });
});
