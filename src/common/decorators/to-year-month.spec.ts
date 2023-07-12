import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import TransformToYearMonth from './to-year-month';

class TestClass {
  @TransformToYearMonth()
  value: Date;
}

describe('TransformToYearMonth', () => {
  it('should return date', () => {
    const { value } = transform('2000-01');

    expect(value).toBeInstanceOf(Date);
  });

  it('should throw error if is empty string', () => {
    const transformation = () => transform('');

    expect(transformation).toThrow(BadRequestException);
  });

  it('should throw error if is full date', () => {
    const transformation = () => transform('2000-01-01');

    expect(transformation).toThrow(BadRequestException);
  });

  it('should throw error if is random', () => {
    const transformation = () => transform('random');

    expect(transformation).toThrow(BadRequestException);
  });

  it('should throw error if is random and date', () => {
    const transformation = () => transform('random 2000-01');

    expect(transformation).toThrow(BadRequestException);
  });

  it('should throw error if is date and random', () => {
    const transformation = () => transform('2000-01 random');

    expect(transformation).toThrow(BadRequestException);
  });

  function transform(value: any) {
    return plainToInstance(TestClass, { value });
  }
});
