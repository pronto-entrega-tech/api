import { vi } from 'vitest';

export const setup = () => {
  vi.mock('@nestjs/common', () => ({
    Logger: class {
      constructor() {
        Object.assign(this, console);
      }
    },
  }));

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
};
