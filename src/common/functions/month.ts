import { addMonths, subMonths } from "date-fns";

function from(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  return new Date(Date.UTC(year, month));
}

function previous(date: Date) {
  return subMonths(from(date), 1);
}

function next(date: Date) {
  return addMonths(from(date), 1);
}

/**
 * @example 'yyyy-MM-dd'
 */
function shortDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrent() {
  return from(new Date());
}

function getLast() {
  return previous(getCurrent());
}

function getNext() {
  return next(getCurrent());
}

export const Month = {
  from,
  previous,
  next,
  shortDate,
  getCurrent,
  getLast,
  getNext,
};
