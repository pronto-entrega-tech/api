export const setup = () => {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
};
