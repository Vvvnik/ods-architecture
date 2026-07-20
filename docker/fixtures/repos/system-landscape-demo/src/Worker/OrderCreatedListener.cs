using Demo.Contracts;
using RabbitMQ.Client;

namespace Demo.Worker;

public sealed class OrderCreatedListener
{
    public void OnOrderCreated(OrderCreatedMessage message)
    {
        _ = message.OrderId;
    }
}
