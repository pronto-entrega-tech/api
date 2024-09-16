import { ValidationPipe } from "@nestjs/common";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { TestingModule } from "@nestjs/testing";
import { fastifyCookie } from "@fastify/cookie";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const initApp = async (module: TestingModule) => {
  const app = await createApp(module);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
};

export const initAppAndListen = async (module: TestingModule) => {
  const app = await createApp(module);

  await app.listen(3000);

  return app;
};

const createApp = async (module: TestingModule) => {
  const app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter()
  );
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
  });

  return app;
};
