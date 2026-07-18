using Xunit;

namespace Ods.DotnetApiRoutesParser.Tests;

public class ApiRoutesExtractorTests
{
    [Fact]
    public void Extracts_controller_HttpGet_with_class_Route()
    {
        var dir = Path.Combine(Path.GetTempPath(), "ods-api-routes-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var file = Path.Combine(dir, "HealthController.cs");
            File.WriteAllText(file, """
                using Microsoft.AspNetCore.Mvc;
                namespace Demo.Api.Controllers;
                [Route("api/[controller]")]
                public class HealthController : ControllerBase
                {
                    [HttpGet]
                    public IActionResult Get() => Ok();

                    [HttpGet("ready")]
                    public IActionResult Ready() => Ok();
                }
                """);

            var routes = ApiRoutesExtractor.ExtractFiles(dir, ["HealthController.cs"]);
            Assert.Contains(routes, r => r.Style == "controller" && r.Method == "GET" && r.Path == "/api/[controller]");
            Assert.Contains(routes, r => r.Style == "controller" && r.Method == "GET" && r.Path == "/api/[controller]/ready");
        }
        finally
        {
            Directory.Delete(dir, true);
        }
    }

    [Fact]
    public void Extracts_MapGet_literal()
    {
        var dir = Path.Combine(Path.GetTempPath(), "ods-api-routes-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        try
        {
            var file = Path.Combine(dir, "Program.cs");
            File.WriteAllText(file, """
                var app = WebApplication.CreateBuilder().Build();
                app.MapGet("/health", () => Results.Ok());
                """);

            var routes = ApiRoutesExtractor.ExtractFiles(dir, ["Program.cs"]);
            Assert.Contains(routes, r => r.Style == "minimal" && r.Method == "GET" && r.Path == "/health");
        }
        finally
        {
            Directory.Delete(dir, true);
        }
    }
}
