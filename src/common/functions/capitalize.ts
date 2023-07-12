export const capitalize = (v: string) =>
  `${v.at(0)?.toUpperCase()}${v.slice(1).toLowerCase()}`;
