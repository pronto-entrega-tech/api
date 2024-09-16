import { ConflictException } from "@nestjs/common";
import { EntityName } from "../constants/entities-names";

export class AlreadyExistError extends ConflictException {
  constructor(prefix: EntityName, withSame?: string[]) {
    const _withSame = (withSame && `with same ${join(withSame)} `) ?? "";

    super(`${prefix} ${_withSame}already exist`);
  }
}

const join = (array: string[]) => {
  if (array.length <= 1) return array.join("");

  return `${array.slice(0, -1).join(", ")} and ${array.at(-1)}`;
};
