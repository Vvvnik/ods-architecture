using System.Text.Json.Serialization;

namespace Ods.DotnetApiRoutesParser;

public sealed class Envelope
{
    [JsonPropertyName("parser_id")]
    public string ParserId { get; set; } = "dotnet-api-routes";

    [JsonPropertyName("schema_version")]
    public string SchemaVersion { get; set; } = "1";

    [JsonPropertyName("project_id")]
    public string ProjectId { get; set; } = "";

    [JsonPropertyName("analysis_run_id")]
    public string AnalysisRunId { get; set; } = "";

    [JsonPropertyName("generated_at")]
    public string GeneratedAt { get; set; } = "";

    [JsonPropertyName("files_analyzed")]
    public List<string> FilesAnalyzed { get; set; } = [];

    [JsonPropertyName("model")]
    public ApiRoutesModel Model { get; set; } = new();
}

public sealed class ApiRoutesModel
{
    [JsonPropertyName("routes")]
    public List<ApiRoute> Routes { get; set; } = [];
}

public sealed class ApiRoute
{
    [JsonPropertyName("method")]
    public string Method { get; set; } = "";

    [JsonPropertyName("path")]
    public string Path { get; set; } = "";

    [JsonPropertyName("source_path")]
    public string SourcePath { get; set; } = "";

    [JsonPropertyName("style")]
    public string Style { get; set; } = "";

    [JsonPropertyName("handler_name")]
    public string? HandlerName { get; set; }

    [JsonPropertyName("service_hint")]
    public string? ServiceHint { get; set; }

    [JsonPropertyName("path_complete")]
    public bool PathComplete { get; set; } = true;
}
