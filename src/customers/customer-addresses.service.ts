import { Injectable } from "@nestjs/common";
import { CustomersRepository } from "~/repositories/customers/customers.repository";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly customersRepo: CustomersRepository) {}

  async create(customer_id: string, dto: CreateAddressDto) {
    return this.customersRepo.addresses.create(customer_id, dto);
  }

  findMany(customer_id: string) {
    return this.customersRepo.addresses.findMany(customer_id);
  }

  update(customer_id: string, address_id: string, dto: UpdateAddressDto) {
    return this.customersRepo.addresses.update(customer_id, address_id, dto);
  }

  delete(customer_id: string, address_id: string) {
    return this.customersRepo.addresses.delete(customer_id, address_id);
  }
}
