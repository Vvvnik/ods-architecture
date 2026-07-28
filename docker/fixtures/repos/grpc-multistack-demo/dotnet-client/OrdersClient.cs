using Grpc.Net.Client;

public sealed class OrdersClient {
  public async Task RunAsync() {
    using var channel = GrpcChannel.ForAddress("http://localhost:8080");
    var client = new OrdersServiceClient(channel);
    await client.GetOrderAsync(new object());
  }
}
