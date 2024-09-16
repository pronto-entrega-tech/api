import { addMinutes } from "date-fns";

export const lastMonth = new Date("2000-02-01");
export const currentMonth = new Date("2000-03-01");
export const nextMonth = new Date("2000-04-01");

export const expiresInOneMinute = addMinutes(new Date(), 1);
