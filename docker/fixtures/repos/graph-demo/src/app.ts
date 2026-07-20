import { info, warn } from './logger.js';
import { createUser, formatUser } from './services/user.js';
import { add, mul } from './utils/math.js';

export function boot(): void {
  info('boot start');
  const user = createUser('Ada');
  const score = mul(add(2, 3), 4);
  warn(`user=${formatUser(user)} score=${score}`);
}

boot();
