import { Module } from "@nestjs/common";
import { ItemUpdateGateway } from "./item-update.gateway";
import { ItemsController, ItemsPrivateController } from "./items.controller";
import { ItemsGateway } from "./items.gateway";
import { ItemsService } from "./items.service";

@Module({
  controllers: [ItemsController, ItemsPrivateController],
  providers: [ItemsService, ItemsGateway, ItemUpdateGateway],
})
export class ItemsModule {}
