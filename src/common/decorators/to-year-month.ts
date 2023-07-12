import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';

const TransformToYearMonth = () =>
  Transform(({ value }) => {
    const regex = /^[12]\d{3}-(0[1-9]|1[0-2])$/;
    const valid = typeof value === 'string' && regex.test(value);
    if (!valid)
      throw new BadRequestException([
        'date must be a valid YYYY-MM date string',
      ]);

    return new Date(value);
  });

export default TransformToYearMonth;
