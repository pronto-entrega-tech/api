import { Transform } from "class-transformer";

const TransformToDate = () =>
  Transform(({ value }) => new Date(!isNaN(value) ? +value : value));

export default TransformToDate;
