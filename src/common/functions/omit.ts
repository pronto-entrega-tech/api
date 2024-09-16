export const omit = <T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> =>
  keys.reduce(
    (result, key) => {
      delete result[key];
      return result;
    },
    { ...obj },
  );
