export function randomNumber(p: { size: number }) {
  return Math.random()
    .toString()
    .slice(2, p.size + 2);
}
