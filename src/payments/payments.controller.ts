import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { PaymentsService } from "./payments.service";
import { Asaas } from "./asaas/asaas.types";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiOperation({ summary: "Asaas Webhook" })
  @Post("asaas-webhook")
  createCity(@Req() req: FastifyRequest, @Body() body: Asaas.WebHookBody) {
    const token = req.headers["asaas-access-token"];
    if (typeof token !== "string") throw new UnauthorizedException();

    return this.payments.handleWebhook(body, token);
  }
}
