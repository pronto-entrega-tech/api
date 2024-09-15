import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { FastifyAdapter as BullFastifyAdapter } from '@bull-board/fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCsrf from '@fastify/csrf-protection';
import fastifyHelmet, { FastifyHelmetOptions } from '@fastify/helmet';
import { HttpException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { FastifyRegisterOptions } from 'fastify';
import BullQueue from 'bull';
import { AppModule } from './app.module';
import {
  ADMIN_ACCESS_TOKEN,
  CUSTOMER_ACCESS_TOKEN,
  MARKET_ACCESS_TOKEN,
  MARKET_SUB_ACCESS_TOKEN,
} from './auth/constants/auth-tokens';
import { isDev } from './common/constants/is-dev';
import { QueueName } from './common/constants/queue-names';
import { STATIC_PATH } from '~/common/constants/paths';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import { networkInterfaces } from 'os';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { contentParser } from 'fastify-file-interceptor';

const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ ...httpsOpts, bodyLimit: 2 * MiB }),
  );

  app.enableCors({
    origin: [
      /localhost:\d+$/,
      `http://${localIp}:3000`,
      'https://prontoentrega.com.br',
    ],
    credentials: true,
  });
  app.useGlobalInterceptors(new ReqResModifyInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(fastifyCsrf, {
    cookieOpts: { path: '/', sameSite: true, httpOnly: true, signed: true },
  });
  await app.register(fastifyHelmet, isDev ? devHelmetOpts : prodHelmetOpts);
  app.register(contentParser);

  const docsPath = '/docs';
  const bullBoardPath = '/bull-board';
  if (isDev) {
    app.useStaticAssets({
      root: STATIC_PATH,
      prefix: '/static/',
    });
    await fs.cp('./example/static', STATIC_PATH, {
      recursive: true,
      force: false,
      errorOnExist: false,
    });

    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('ProntoEntrega API')
      .setVersion('Evolution')
      .addBearerAuth({ type: 'http' }, ADMIN_ACCESS_TOKEN)
      .addBearerAuth({ type: 'http' }, CUSTOMER_ACCESS_TOKEN)
      .addBearerAuth({ type: 'http' }, MARKET_ACCESS_TOKEN)
      .addBearerAuth({ type: 'http' }, MARKET_SUB_ACCESS_TOKEN)
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(docsPath, app, document);

    const serverAdapter = new BullFastifyAdapter();
    serverAdapter.setBasePath(bullBoardPath);

    const queues = Object.values(QueueName).map(
      (name) => new BullAdapter(new BullQueue(name)),
    );
    createBullBoard({ queues, serverAdapter });
    app.register(serverAdapter.registerPlugin(), {
      basePath: '',
      prefix: bullBoardPath,
    });
  }

  const port = process.env.PORT ?? 3000;
  const useLocalIp = process.env.USE_LOCAL_IP === 'true';
  const address = useLocalIp && isDev ? localIp : undefined;

  // Start
  await app.listen(port, address ?? 'localhost');

  const appUrl = await app.getUrl();
  console.log(`Application is running on: ${appUrl}`);
  if (isDev) {
    console.log(`Docs is running on:        ${appUrl}${docsPath}`);
    console.log(`Bull Board is running on:  ${appUrl}${bullBoardPath}`);
  }
};

const logger = new Logger('UnhandledRejection');
process.on('unhandledRejection', (error) => {
  if (error instanceof HttpException) {
    logger.error(error);
  } else {
    throw error;
  }
});

// This Fix `TypeError: Do not know how to serialize a BigInt`
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const MiB = 2 ** 20;

const localIp = networkInterfaces().en0?.find(
  (v) => v.family === 'IPv4',
)?.address;

const devHelmetOpts: FastifyRegisterOptions<FastifyHelmetOptions> = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`, `'unsafe-inline'`],
      imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
      scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
};
const prodHelmetOpts: FastifyRegisterOptions<FastifyHelmetOptions> = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [`'self'`],
      styleSrc: [`'self'`],
      imgSrc: [`'self'`],
      scriptSrc: [`'self'`],
    },
  },
};

const useHttps = process.env.HTTPS === 'true';

const httpsOpts =
  useHttps && isDev
    ? {
        https: {
          key: readFileSync('./https_cert/localhost-key.pem'),
          cert: readFileSync('./https_cert/localhost.pem'),
        },
      }
    : undefined;

/**
 * Make nestjs-opentelemetry (MetricHttpEventProducer) compatible with fastify.
 */
@Injectable()
export class ReqResModifyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    request.route = Object.assign(request.route || {}, {
      path: request.raw.url,
    });
    response.__proto__.once = response.raw.once;
    response.__proto__.removeListener = response.raw.removeListener;
    response.__proto__.on = function (_, callback) {
      callback();
    };
    return next.handle();
  }
}

bootstrap();
