import { apiFetch } from './client.js';

export async function listOrders() {
  return apiFetch('/api/orders/', { method: 'GET' });
}

export async function getOrder(orderId: string) {
  return apiFetch(`/api/orders/${orderId}/`, { method: 'GET' });
}
