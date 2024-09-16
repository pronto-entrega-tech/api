import { plainToInstance } from "class-transformer";
import TransformToBigInt from "./to-bigint";
import { describe, expect, it } from "vitest";

class TestClass {
  @TransformToBigInt()
  value: bigint;
}

describe("TransformToBigInt", () => {
  it("should return bigint", () => {
    const { value } = plainToInstance(TestClass, { value: "1" });

    expect(typeof value).toEqual("bigint");
  });
});
