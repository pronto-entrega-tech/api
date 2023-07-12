type Decision<A, D> = { action: A; data: D };

/**
 * Represent a decision returned by a function.
 */
export const createDecision = <A extends string, D = undefined>(
  action: A,
  data?: D,
): Decision<A, D> => {
  return { action, data: data as D };
};
