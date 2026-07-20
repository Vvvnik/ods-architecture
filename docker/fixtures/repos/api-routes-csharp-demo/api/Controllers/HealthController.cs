using Microsoft.AspNetCore.Mvc;

namespace ApiRoutesDemo.Controllers;

[Route("api/[controller]")]
[ApiController]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });

    [HttpGet("ready")]
    public IActionResult Ready() => Ok(new { ready = true });
}
