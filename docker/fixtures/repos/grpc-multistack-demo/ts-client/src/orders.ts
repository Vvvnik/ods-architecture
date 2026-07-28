export async function loadOrders(ordersServiceClient) {
  return ordersServiceClient.GetOrder({ id: '1' });
}
