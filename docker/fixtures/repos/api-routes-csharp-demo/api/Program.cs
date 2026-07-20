var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.MapGet("/minimal/ping", () => Results.Ok(new { ping = true }));
app.Run();
