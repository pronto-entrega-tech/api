type Effect<A, D> = { type: A; data: D };

/**
 * Represent a side-effect returned by a function to be executed.
 */
export const createEffect = <T extends string, D = undefined>(
  type: T,
  data?: D,
): Effect<T, D> => {
  return { type, data: data as D };
};
