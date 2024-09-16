import { isDev, isTest } from "../constants/is-dev";

export function envPath() {
  if (isDev) return [".env.local", ".env.development"];
  if (isTest) return [".env.local", ".env.development", ".env.test.local"];
}
