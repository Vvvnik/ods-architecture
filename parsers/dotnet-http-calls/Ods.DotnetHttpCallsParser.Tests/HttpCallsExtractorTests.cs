using Xunit;

namespace Ods.DotnetHttpCallsParser.Tests;

public class HttpCallsExtractorTests
{
    [Fact]
    public void Extracts_Static_Http_Method_Call()
    {
        var calls = HttpCallsExtractor.Extract(
            "var x = await _http.GetAsync(\"/api/v1/orders\");",
            "orders/OrdersHttpClient.cs"
        );

        Assert.Single(calls);
        Assert.Equal("GET", calls[0]["method"]);
        Assert.Equal("/api/v1/orders", calls[0]["path"]);
    }
}
