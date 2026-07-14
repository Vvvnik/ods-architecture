using System.Text.Json.Serialization;

namespace Ods.CSharpParser;

public sealed class Envelope
{
    [JsonPropertyName("parser_id")]
    public required string ParserId { get; init; }

    [JsonPropertyName("schema_version")]
    public required string SchemaVersion { get; init; }

    [JsonPropertyName("project_id")]
    public required string ProjectId { get; init; }

    [JsonPropertyName("analysis_run_id")]
    public required string AnalysisRunId { get; init; }

    [JsonPropertyName("generated_at")]
    public required string GeneratedAt { get; init; }

    [JsonPropertyName("files_analyzed")]
    public required List<string> FilesAnalyzed { get; init; }

    [JsonPropertyName("model")]
    public required CSharpModel Model { get; init; }
}

public sealed class CSharpModel
{
    [JsonPropertyName("symbols")]
    public required List<Symbol> Symbols { get; init; }

    [JsonPropertyName("usages")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<Usage>? Usages { get; init; }
}

public sealed class Symbol
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("kind")]
    public required string Kind { get; init; }

    [JsonPropertyName("path")]
    public required string Path { get; init; }

    [JsonPropertyName("qualified_name")]
    public required string QualifiedName { get; init; }

    [JsonPropertyName("parent_qualified_name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ParentQualifiedName { get; init; }

    [JsonPropertyName("signature")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Signature { get; init; }

    [JsonPropertyName("location")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Location? Location { get; init; }

    [JsonPropertyName("refs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<SymbolRef>? Refs { get; init; }
}

public sealed class SymbolRef
{
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("kind")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Kind { get; init; }

    [JsonPropertyName("path")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Path { get; init; }

    [JsonPropertyName("qualified_name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? QualifiedName { get; init; }
}

public sealed class Usage
{
    [JsonPropertyName("from")]
    public required string From { get; init; }

    [JsonPropertyName("to")]
    public required string To { get; init; }

    [JsonPropertyName("type")]
    public required string Type { get; init; }

    [JsonPropertyName("path")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Path { get; init; }

    [JsonPropertyName("location")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Location? Location { get; init; }

    [JsonPropertyName("metadata")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object>? Metadata { get; init; }
}

public sealed class Location
{
    [JsonPropertyName("start_line")]
    public int StartLine { get; init; }

    [JsonPropertyName("start_col")]
    public int StartCol { get; init; }

    [JsonPropertyName("end_line")]
    public int EndLine { get; init; }

    [JsonPropertyName("end_col")]
    public int EndCol { get; init; }
}
