import { Transform } from "class-transformer";

const TransformToDate = () =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  Transform(({ value }) => new Date(!isNaN(value) ? +value : value));

export default TransformToDate;
