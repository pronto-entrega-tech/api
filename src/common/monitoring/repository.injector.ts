import { Injectable, Logger } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { BaseTraceInjector } from "@amplication/opentelemetry-nestjs/dist/Trace/Injectors/BaseTraceInjector";
import { Injector } from "@amplication/opentelemetry-nestjs/dist/Trace/Injectors/Injector";

@Injectable()
export class RepositoryInjector extends BaseTraceInjector implements Injector {
  private readonly loggerService = new Logger();

  constructor(protected readonly modulesContainer: ModulesContainer) {
    super(modulesContainer);
  }

  public inject() {
    const providers = this.getProviders();

    for (const provider of providers) {
      if (!provider.name.endsWith("Repository")) continue;

      const keys = this.metadataScanner.getAllFilteredMethodNames(
        provider.metatype.prototype,
      );

      for (const key of keys) {
        if (
          !this.isDecorated(provider.metatype.prototype[key]) &&
          !this.isAffected(provider.metatype.prototype[key])
        ) {
          const traceName = `Repository->${provider.name}.${provider.metatype.prototype[key].name}`;
          const method = this.wrap(
            provider.metatype.prototype[key],
            traceName,
            {
              repository: provider.name,
              method: provider.metatype.prototype[key].name,
            },
          );
          this.reDecorate(provider.metatype.prototype[key], method);

          provider.metatype.prototype[key] = method;
          this.loggerService.log(
            `Mapped ${provider.name}.${key}`,
            this.constructor.name,
          );
        }
      }
    }
  }
}
