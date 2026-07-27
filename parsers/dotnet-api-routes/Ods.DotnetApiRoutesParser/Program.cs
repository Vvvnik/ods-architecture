using System.Text.Json;

namespace Ods.DotnetApiRoutesParser;

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
        foreach (var key in RequiredArgs)
        {
            if (!parsed.ContainsKey(key) || string.IsNullOrWhiteSpace(parsed[key]))
            {
                await Console.Error.WriteLineAsync($"Missing required argument: --{key}");
                return 1;
            }
        }

        var workingCopyRoot = parsed["working-copy-root"];
        var files = await ResolveFiles(parsed);
        var posixFiles = files.Select(path => path.Replace('\\', '/')).ToList();
        var routes = ApiRoutesExtractor.ExtractFiles(workingCopyRoot, posixFiles);

        var envelope = new Envelope
        {
            ProjectId = parsed["project-id"],
            AnalysisRunId = parsed["analysis-run-id"],
            GeneratedAt = DateTime.UtcNow.ToString("O"),
            FilesAnalyzed = posixFiles,
            Model = new ApiRoutesModel { Routes = routes },
        };

        var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(parsed["output"], json);
        return 0;
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
