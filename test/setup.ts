export const setup = () => {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
};
