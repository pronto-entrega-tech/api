/**
 * If is throw a error, will try again the function, 10 times by default
 */
const retry = async <T = void>(
  fn: (tryNumber: number) => T,
  maxNumberOfTries = 10,
): Promise<T> => {
  return _try();

  async function _try(tries = 1) {
    try {
      return await fn(tries);
    } catch (err) {
      if (tries >= maxNumberOfTries) throw err;
      return _try(tries + 1);
    }
  }
};

export default retry;
