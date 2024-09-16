import { JWT } from "~/common/jwt/jwt";
import { CreateConfirmationTokenDto } from "../dto/update.dto";
import { ConfirmationTokenPayload } from "../orders.service";

export async function confirmationToken(
  dto: CreateConfirmationTokenDto & { market_order_id: bigint },
) {
  const payload: ConfirmationTokenPayload = {
    iss: "ProntoEntrega",
    sub: `${dto.order_id}`,
    type: "confirm_delivery",
    market_order_id: dto.market_order_id,
    items: dto.missing_items,
  };
  return JWT.signAsync(payload, { expiresIn: "1d" });
}
