import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { FastifyAdapter as BullFastifyAdapter } from "@bull-board/fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCsrf from "@fastify/csrf-protection";
import fastifyHelmet, { FastifyHelmetOptions } from "@fastify/helmet";
import { HttpException, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import BullQueue from "bull";
import { AppModule } from "./app.module";
import {
  ADMIN_ACCESS_TOKEN,
  CUSTOMER_ACCESS_TOKEN,
  MARKET_ACCESS_TOKEN,
  MARKET_SUB_ACCESS_TOKEN,
} from "./auth/constants/auth-tokens";
import { isDev } from "./common/constants/is-dev";
import { QueueName } from "./common/constants/queue-names";
import { STATIC_PATH } from "~/common/constants/paths";
import { readFileSync } from "fs";
import fs from "fs/promises";
import { networkInterfaces } from "os";
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import EventEmitter from "events";

const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ ...httpsOpts, bodyLimit: 2 * MiB })
  );

  app.enableCors({
    origin: isDev
      ? [/localhost:\d+$/, `http://${localIp}:3001`]
      : "https://prontoentrega.com.br",
    credentials: true,
  });
  app.useGlobalInterceptors(new ReqResModifyInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(fastifyCsrf, {
    cookieOpts: { path: "/", sameSite: true, httpOnly: true, signed: true },
  });
  if (!isDev) await app.register(fastifyHelmet, prodHelmetOpts);

  const docsPath = "/docs";
  const bullBoardPath = "/bull-board";
  if (isDev) {
    app.useStaticAssets({
      root: STATIC_PATH,
      prefix: "/static/",
    });
    await fs.cp("./example/static", STATIC_PATH, {
      recursive: true,
      force: false,
      errorOnExist: false,
    });

    const { SwaggerModule, DocumentBuilder } = await import("@nestjs/swagger");
    const config = new DocumentBuilder()
      .setTitle("ProntoEntrega API")
      .setVersion("Evolution")
      .addBearerAuth({ type: "http" }, ADMIN_ACCESS_TOKEN)
      .addBearerAuth({ type: "http" }, CUSTOMER_ACCESS_TOKEN)
      .addBearerAuth({ type: "http" }, MARKET_ACCESS_TOKEN)
      .addBearerAuth({ type: "http" }, MARKET_SUB_ACCESS_TOKEN)
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(docsPath, app, document);

    const serverAdapter = new BullFastifyAdapter();
    serverAdapter.setBasePath(bullBoardPath);

    const queues = Object.values(QueueName).map(
      (name) => new BullAdapter(new BullQueue(name))
    );
    createBullBoard({ queues, serverAdapter });
    app
      .register(serverAdapter.registerPlugin(), {
        basePath: "",
        prefix: bullBoardPath,
      })
      .catch?.(console.error);
  }

  const port = process.env.PORT ?? 3000;
  const address = isDev ? localIp : undefined;

  // Start
  await app.listen(port, address ?? "localhost");

  const appUrl = await app.getUrl();
  console.log(`Application is running on: ${appUrl}`);
  if (isDev) {
    console.log(`Docs is running on:        ${appUrl}${docsPath}`);
    console.log(`Bull Board is running on:  ${appUrl}${bullBoardPath}`);
  }
};

const logger = new Logger("UnhandledRejection");
process.on("unhandledRejection", (error) => {
  if (error instanceof HttpException) {
    logger.error(error);
  } else {
    throw error;
  }
});

// This Fix `TypeError: Do not know how to serialize a BigInt`
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const MiB = 2 ** 20;

const localIp = networkInterfaces().en0?.find(
  (v) => v.family === "IPv4"
)?.address;

const prodHelmetOpts: FastifyHelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`],
      imgSrc: [`'self'`],
      scriptSrc: [`'self'`],
    },
  },
};

const useHttps = process.env.HTTPS === "true";

const httpsOpts =
  useHttps && isDev
    ? {
        https: {
          key: readFileSync("./https_cert/localhost-key.pem"),
          cert: readFileSync("./https_cert/localhost.pem"),
        },
      }
    : undefined;

/**
 * Make nestjs-opentelemetry (MetricHttpEventProducer) compatible with fastify.
 */
@Injectable()
export class ReqResModifyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { route?: { path?: string } }>();
    const response = context
      .switchToHttp()
      .getResponse<FastifyReply & { __proto__: EventEmitter }>();

    request.route = Object.assign(request.route || {}, {
      path: request.raw.url,
    });
    response.__proto__.once = response.raw.once.bind(response.raw);
    response.__proto__.removeListener = response.raw.removeListener.bind(
      response.raw
    );
    response.__proto__.on = function (_, callback) {
      callback();
      return this;
    };
    return next.handle();
  }
}

void bootstrap();
