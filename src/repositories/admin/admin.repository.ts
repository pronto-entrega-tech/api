import { Injectable } from "@nestjs/common";
import { admin } from "@prisma/client";
import { PrismaService } from "~/common/prisma/prisma.service";

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: admin) {
    return this.prisma.admin.create({ data: dto });
  }

  async findId(email: string) {
    const admin = await this.prisma.admin.findUnique({
      select: { admin_id: true },
      where: { email },
    });
    return admin?.admin_id;
  }

  async exist(email: string) {
    return !!(await this.findId(email));
  }
}
