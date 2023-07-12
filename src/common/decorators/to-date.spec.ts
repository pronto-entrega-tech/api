import { plainToInstance } from 'class-transformer';
import TransformToDate from './to-date';

class TestClass {
  @TransformToDate()
  value: Date;
}

describe('TransformToDate', () => {
  it('should return date', () => {
    const { value } = plainToInstance(TestClass, { value: '2000-01' });

    expect(value).toBeInstanceOf(Date);
  });
});
