using System.Text.Json;

namespace Ods.CSharpParser;

public static class Program
{
    private static readonly string[] RequiredArgs =
    [
        "project-id",
        "working-copy-root",
        "analysis-run-id",
        "files",
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
        var files = JsonSerializer.Deserialize<List<string>>(parsed["files"]) ?? [];
        var symbols = new List<Symbol>();

        foreach (var relativePath in files)
        {
            var posixPath = relativePath.Replace('\\', '/');
            var absolutePath = Path.Combine(workingCopyRoot, posixPath);
            if (!File.Exists(absolutePath))
            {
                await Console.Error.WriteLineAsync($"File not found: {absolutePath}");
                return 1;
            }

            symbols.AddRange(CSharpExtractor.ExtractFile(posixPath, absolutePath));
        }

        var envelope = new Envelope
        {
            ParserId = "csharp",
            SchemaVersion = "1",
            ProjectId = parsed["project-id"],
            AnalysisRunId = parsed["analysis-run-id"],
            GeneratedAt = DateTime.UtcNow.ToString("O"),
            FilesAnalyzed = files.Select(path => path.Replace('\\', '/')).ToList(),
            Model = new CSharpModel { Symbols = symbols },
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
}
