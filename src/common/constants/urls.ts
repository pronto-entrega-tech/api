import { networkInterfaces } from 'node:os';
import { isDev } from './is-dev';

const lanIp = networkInterfaces().en0?.find(
  (v) => v.family === 'IPv4',
)?.address;

export const PRONTO_ENTREGA = 'https://prontoentrega.com.br';

export const STATIC_URL = isDev
  ? `http://${lanIp}:3000/static`
  : 'https://static.prontoentrega.com.br';
