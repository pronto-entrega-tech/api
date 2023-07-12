import { Injectable } from '@nestjs/common';
import { admin } from '@prisma/client';

@Injectable()
export class InMemoryAdminRepository {
  private readonly admins = [] as admin[];

  async create(dto: admin) {
    this.admins.push(dto);
    return dto;
  }

  async findId(email: string) {
    const admin = this.admins.find((a) => a.email === email);

    return admin?.admin_id;
  }

  async exist(email: string) {
    return !!this.admins.find((a) => a.email === email);
  }
}
