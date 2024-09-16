import { fail } from "assert";

export const appRecipientKey = () =>
  process.env.ASAAS_WALLET_ID ?? fail("ASAAS_WALLET_ID must be defined");
