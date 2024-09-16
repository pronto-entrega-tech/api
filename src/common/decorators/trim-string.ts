import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { Allow } from "class-validator";

const allow = Allow();

const transform = Transform(({ value }) => {
  const transform = (value: unknown) => {
    if (typeof value !== "string") return value;

    return value.trim();
  };
  return Array.isArray(value) ? value.map(transform) : transform(value);
});

const TransformTrimString = () => applyDecorators(allow, transform);

export default TransformTrimString;
