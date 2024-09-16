import { vi } from "vitest";
import { Injectable } from "@nestjs/common/decorators/core/injectable.decorator";
import { applyDecorators } from "@nestjs/common/decorators/core/apply-decorators";
import { BadRequestException } from "@nestjs/common/exceptions/bad-request.exception";
import { NotFoundException } from "@nestjs/common/exceptions/not-found.exception";

export const setup = () => {
  vi.mock("@nestjs/common", () => ({
    Logger: class {
      constructor() {
        Object.assign(this, console);
      }
    },
    Injectable,
    applyDecorators,
    BadRequestException,
    NotFoundException,
  }));
};
