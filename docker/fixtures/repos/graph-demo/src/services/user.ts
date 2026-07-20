import { info } from '../logger.js';
import { add } from '../utils/math.js';

export interface User {
  id: string;
  name: string;
}

export function createUser(name: string): User {
  const id = String(add(1000, name.length));
  info(`createUser: ${name}`);
  return { id, name };
}

export function formatUser(user: User): string {
  return `${user.id}:${user.name}`;
}
