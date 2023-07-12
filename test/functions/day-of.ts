export const day = (day: number) => ({
  of: (date: Date) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)),
});
