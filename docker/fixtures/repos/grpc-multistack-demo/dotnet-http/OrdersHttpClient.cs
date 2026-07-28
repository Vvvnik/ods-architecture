public sealed class OrdersHttpClient {
  private readonly HttpClient _http;
  public OrdersHttpClient(HttpClient http) { _http = http; }
  public Task<HttpResponseMessage> GetAsync() => _http.GetAsync("/api/v1/orders");
}
