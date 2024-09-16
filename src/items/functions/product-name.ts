import { products } from "@prisma/client";

const format = (s: string | null) => (s ? ` ${s}` : "");

export const getProductName = (
  p: Pick<products, "name" | "brand" | "quantity">,
) => `${p.name}${format(p.brand)}${format(p.quantity)}`;
