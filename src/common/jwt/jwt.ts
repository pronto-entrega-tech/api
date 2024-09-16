import { JwtService } from "@nestjs/jwt";

export const JWT = new JwtService({
  secret: process.env.TOKEN_SECRET,
});
