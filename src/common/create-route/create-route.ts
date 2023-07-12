import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import Fastify from 'fastify';
import { AuthReq } from '~/auth/constants/auth-req';

const fastify = Fastify({
  logger: true,
});

type ValidAuthReq<
  P extends ClassConstructor<any>,
  Q extends ClassConstructor<any>,
  B extends ClassConstructor<any>,
> = {
  params: InstanceType<P>;
  query: InstanceType<Q>;
  body: InstanceType<B>;
};

type Route = <
  P extends ClassConstructor<any>,
  Q extends ClassConstructor<any>,
  B extends ClassConstructor<any>,
>(
  path: string,
  opts: { paramsSchema?: P; querySchema?: Q; bodySchema: B },
  fn: (job: AuthReq & ValidAuthReq<P, Q, B>) => any,
) => any;

export const CreateRoute: {
  get: Route;
  post: Route;
  patch: Route;
  put: Route;
  delete: Route;
} = {
  get: (path, opts, fn) => {
    fastify.get(path, async (req: AuthReq) => {
      transformAndValidateRequest(opts, req);
      return fn(req as any);
    });
  },

  post: (path, opts, fn) => {
    fastify.post(path, async (req: AuthReq) => {
      transformAndValidateRequest(opts, req);
      return fn(req as any);
    });
  },

  patch: (path, opts, fn) => {
    fastify.patch(path, async (req: AuthReq) => {
      transformAndValidateRequest(opts, req);
      return fn(req as any);
    });
  },

  put: (path, opts, fn) => {
    fastify.put(path, async (req: AuthReq) => {
      transformAndValidateRequest(opts, req);
      return fn(req as any);
    });
  },

  delete: (path, opts, fn) => {
    fastify.delete(path, async (req: AuthReq) => {
      transformAndValidateRequest(opts, req);
      return fn(req as any);
    });
  },
};

const transformAndValidateRequest = async (opts: any, req: AuthReq) => {
  const [params, query, body] = await Promise.all([
    transformAndValidate(opts.paramsSchema, req.params),
    transformAndValidate(opts.querySchema, req.query),
    transformAndValidate(opts.bodySchema, req.body),
  ]);

  req.params = params;
  req.query = query;
  req.body = body;
};

const transformAndValidate = async <T extends ClassConstructor<any>>(
  schema: ClassConstructor<T> | undefined,
  obj: any,
) => {
  if (!schema) return obj;

  const newObj = plainToInstance(schema, obj);
  await validateOrReject(newObj);

  return newObj;
};

export enum BasePath {
  Orders = '/orders',
}
