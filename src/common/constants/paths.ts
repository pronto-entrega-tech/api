import { join } from 'path';

export const STATIC_PATH =
  process.env.STATIC_PATH ?? join(__dirname, '..', '..', '..', 'dist-static');
