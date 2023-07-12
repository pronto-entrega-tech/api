import { isDevOrTest } from '../constants/is-dev';

export function envPath() {
  return isDevOrTest ? ['.env', '.env.test'] : undefined;
}
