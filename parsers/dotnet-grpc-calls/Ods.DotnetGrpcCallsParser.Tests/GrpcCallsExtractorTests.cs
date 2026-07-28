using Xunit;

namespace Ods.DotnetGrpcCallsParser.Tests;

public class GrpcCallsExtractorTests
{
    [Fact]
    public void Extracts_Only_Grpc_Client_Method_Calls()
    {
        var calls = GrpcCallsExtractor.Extract(
            """
            using Grpc.Net.Client;
            var channel = GrpcChannel.ForAddress("http://localhost");
            var client = new OrdersService.OrdersServiceClient(channel);
            await client.CreateOrderAsync(new CreateOrderRequest());
            client.GetOrder(new GetOrderRequest());
            """,
            "orders/Client.cs"
        );

        Assert.Equal(2, calls.Count);
        Assert.Equal("orders/Client.cs", calls[0]["source_path"]);
        Assert.Equal("OrdersService/CreateOrder", calls[0]["method"]);
        Assert.Equal("OrdersService/GetOrder", calls[1]["method"]);
    }

    [Fact]
    public void Does_Not_Extract_Channel_ForAddress_As_Grpc_Method()
    {
        var calls = GrpcCallsExtractor.Extract(
            """
            using Grpc.Net.Client;
            var channel = GrpcChannel.ForAddress("http://localhost");
            """,
            "orders/Client.cs"
        );

        Assert.Empty(calls);
    }
}
