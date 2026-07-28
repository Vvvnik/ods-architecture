import grpc
from demo.v1.orders_pb2 import GetOrderRequest
from demo.v1.orders_pb2_grpc import OrdersServiceStub


def get_order(order_id: str):
    channel = grpc.insecure_channel("orders_service:50051")
    stub = OrdersServiceStub(channel)
    return stub.GetOrder(GetOrderRequest(id=order_id))
