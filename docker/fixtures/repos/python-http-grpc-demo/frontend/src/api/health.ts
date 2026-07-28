import { apiFetch } from './client.js';

export async function getHealth() {
  return apiFetch('/health', { method: 'GET' });
}

export async function getPing() {
  return apiFetch('/ping', { method: 'GET' });
}
