using System.Text.Json;

namespace Ods.CSharpParser;

public static class Program
{
    private static readonly string[] RequiredArgs =
    [
        "project-id",
        "working-copy-root",
        "analysis-run-id",
        "output",
    ];

    public static async Task<int> Main(string[] args)
    {
        var parsed = ParseArgs(args);
        var worker = parsed.ContainsKey("ods-worker");

        foreach (var key in worker
                     ? new[] { "project-id", "working-copy-root", "analysis-run-id" }
                     : RequiredArgs)
        {
            if (!parsed.ContainsKey(key) || string.IsNullOrWhiteSpace(parsed[key]))
            {
                await Console.Error.WriteLineAsync($"Missing required argument: --{key}");
                return 1;
            }
        }

        if (worker)
        {
            return await RunWorkerAsync(parsed);
        }

        var workingCopyRoot = parsed["working-copy-root"];
        var files = await ResolveFiles(parsed);
        foreach (var relativePath in files)
        {
            var posixPath = relativePath.Replace('\\', '/');
            var absolutePath = Path.Combine(workingCopyRoot, posixPath);
            if (!File.Exists(absolutePath))
            {
                await Console.Error.WriteLineAsync($"File not found: {absolutePath}");
                return 1;
            }
        }

        var envelope = BuildEnvelope(parsed["project-id"], parsed["analysis-run-id"], workingCopyRoot, files);
        var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(parsed["output"], json);
        return 0;
    }

    private static async Task<int> RunWorkerAsync(Dictionary<string, string> parsed)
    {
        var workingCopyRoot = parsed["working-copy-root"];
        var projectId = parsed["project-id"];
        var analysisRunId = parsed["analysis-run-id"];

        await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new { op = "ready" }));
        await Console.Out.FlushAsync();

        while (true)
        {
            var line = await Console.In.ReadLineAsync();
            if (line is null)
            {
                break;
            }

            line = line.Trim();
            if (line.Length == 0)
            {
                continue;
            }

            Dictionary<string, JsonElement>? msg;
            try
            {
                msg = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(line);
            }
            catch
            {
                await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    op = "chunk_result",
                    chunk_index = -1,
                    status = "error",
                    message = "invalid JSON",
                }));
                await Console.Out.FlushAsync();
                continue;
            }

            if (msg is null || !msg.TryGetValue("op", out var opEl))
            {
                continue;
            }

            var op = opEl.GetString();
            if (op == "shutdown")
            {
                await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new { op = "bye" }));
                await Console.Out.FlushAsync();
                return 0;
            }

            if (op != "chunk")
            {
                await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    op = "chunk_result",
                    chunk_index = msg.TryGetValue("chunk_index", out var ci) ? ci.GetInt32() : -1,
                    status = "error",
                    message = $"unknown op: {op}",
                }));
                await Console.Out.FlushAsync();
                continue;
            }

            var chunkIndex = msg["chunk_index"].GetInt32();
            try
            {
                var fileList = msg["file_list"].GetString()!;
                var output = msg["output"].GetString()!;
                var files = (await File.ReadAllLinesAsync(fileList))
                    .Select(static l => l.Trim())
                    .Where(static l => l.Length > 0)
                    .ToList();
                var envelope = BuildEnvelope(projectId, analysisRunId, workingCopyRoot, files);
                var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(output, json);
                await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    op = "chunk_result",
                    chunk_index = chunkIndex,
                    status = "ok",
                    output,
                }));
                await Console.Out.FlushAsync();
            }
            catch (Exception ex)
            {
                await Console.Out.WriteLineAsync(JsonSerializer.Serialize(new
                {
                    op = "chunk_result",
                    chunk_index = chunkIndex,
                    status = "error",
                    message = ex.Message,
                }));
                await Console.Out.FlushAsync();
            }
        }

        return 0;
    }

    private static Envelope BuildEnvelope(
        string projectId,
        string analysisRunId,
        string workingCopyRoot,
        List<string> files)
    {
        var posixFiles = files.Select(path => path.Replace('\\', '/')).ToList();
        var extract = CSharpExtractor.ExtractFiles(workingCopyRoot, posixFiles);
        return new Envelope
        {
            ParserId = "csharp",
            SchemaVersion = "2",
            ProjectId = projectId,
            AnalysisRunId = analysisRunId,
            GeneratedAt = DateTime.UtcNow.ToString("O"),
            FilesAnalyzed = posixFiles,
            Model = new CSharpModel
            {
                Symbols = extract.Symbols,
                Usages = extract.Usages.Count > 0 ? extract.Usages : null,
            },
        };
    }

    private static Dictionary<string, string> ParseArgs(string[] argv)
    {
        var args = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var i = 0; i < argv.Length; i += 1)
        {
            var key = argv[i];
            if (!key.StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            var name = key[2..];
            if (name is "ods-worker")
            {
                args[name] = "true";
                continue;
            }

            if (i + 1 >= argv.Length)
            {
                continue;
            }

            args[name] = argv[i + 1];
            i += 1;
        }

        return args;
    }

    private static async Task<List<string>> ResolveFiles(Dictionary<string, string> parsed)
    {
        if (parsed.TryGetValue("files", out var filesJson) && !string.IsNullOrWhiteSpace(filesJson))
        {
            return JsonSerializer.Deserialize<List<string>>(filesJson) ?? [];
        }

        if (parsed.TryGetValue("file-list", out var fileListPath) && !string.IsNullOrWhiteSpace(fileListPath))
        {
            return (await File.ReadAllLinesAsync(fileListPath))
                .Select(static line => line.Trim())
                .Where(static line => line.Length > 0)
                .ToList();
        }

        throw new InvalidOperationException("Missing required argument: --files or --file-list");
    }
}
