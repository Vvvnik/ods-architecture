namespace Demo.Contracts;

public sealed class OrderCreatedMessage
{
    public Guid OrderId { get; init; }
}
