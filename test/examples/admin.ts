import { admin } from "@prisma/client";

export const createAdmin: admin = {
  admin_id: "adminId",
  email: "email",
  created_at: new Date(),
};
