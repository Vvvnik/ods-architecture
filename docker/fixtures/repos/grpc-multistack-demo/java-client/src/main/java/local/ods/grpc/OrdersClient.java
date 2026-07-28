package local.ods.grpc;

public class OrdersClient {
  void run() {
    var stub = OrdersServiceGrpc.newBlockingStub(channel);
    stub.GetOrder(null);
  }
}
