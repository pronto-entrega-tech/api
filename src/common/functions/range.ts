export const range = (first: number, last: number, step = 1) => {
  const size = Math.trunc((last - first) / step) + 1;
  if (size < 1) throw new Error("Invalid range");
  return [...Array(size).keys()].map((i) => i * step + first);
};
