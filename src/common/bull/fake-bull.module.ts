import { BullModuleOptions } from "@nestjs/bull";
import { DynamicModule } from "@nestjs/common";

export class FakeBullModule {
  static registerQueue(...options: BullModuleOptions[]): DynamicModule {
    return {
      module: FakeBullModule,
      providers: options.map((opts) => ({
        provide: `BullQueue_${opts.name}`,
        useValue: null,
      })),
      exports: options.map((opts) => `BullQueue_${opts.name}`),
    };
  }
}
