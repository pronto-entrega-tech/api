// Optimization
declare type Omit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P];
};

declare interface BigInt {
  toJSON(): string;
}
