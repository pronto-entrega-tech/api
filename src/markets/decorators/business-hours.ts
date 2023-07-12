import { fail } from 'assert';
import { Transform } from 'class-transformer';
import { ValidationOptions } from 'class-validator';
import { buildMessage, ValidateBy } from 'class-validator';
import { WeekDay } from '../constants/market-enums';
import { BusinessHour } from '../dto/create.dto';
import { SpecialDay } from '../dto/update.dto';

const toSec = (time?: string) => {
  const [timeHour, timeMin] = time?.split(':') ?? [];
  if (!time || !timeHour || !timeMin) return 0;

  return +timeHour * 60 + +timeMin;
};

export const SortBusinessHours = () =>
  Transform(({ value }: { value?: (BusinessHour | SpecialDay)[] }) => {
    if (!value) return;

    return value.sort(
      (bh1, bh2) => toSec(bh1.close_time) - toSec(bh2.open_time),
    );
  });

const isBusinessHours = (BHs: (BusinessHour | SpecialDay)[]) => {
  type Hours = { open_time: string; close_time: string };
  const weekDayArray = Object.values(WeekDay);

  const time = new Map(weekDayArray.map((day) => [day, [] as Hours[]]));

  BHs.forEach((bh) => {
    if ('days' in bh) {
      const { days, ..._hours } = bh;

      days.forEach((day) => time.get(day)?.push(_hours));
    } else {
      const { date, ..._hours } = bh;
      const day = weekDayArray[date.getUTCDay()] ?? fail();

      time.get(day)?.push(_hours);
    }
  });
  const hasOverlap = (h: Hours[], i: number) =>
    toSec(h[i - 1]?.close_time) >= toSec(h[i]?.open_time);

  return ![...time.values()].find((h) => h.find((_, i) => hasOverlap(h, i)));
};

/**
 * Check for overlap
 */
export const IsBusinessHours = (validationOptions?: ValidationOptions) => {
  return ValidateBy(
    {
      name: isBusinessHours.name,
      validator: {
        validate: isBusinessHours,
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must not have overlap',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
};
