export class TestPropertyError extends Error {
  constructor(property: string) {
    super(`'${property}' must be defined in testing`);
  }
}
