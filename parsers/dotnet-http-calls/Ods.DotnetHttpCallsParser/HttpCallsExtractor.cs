using System.Text.RegularExpressions;

public static class HttpCallsExtractor
{
    private static readonly Regex HttpCallRegex = new(
        "(Get|Post|Put|Patch|Delete)Async\\(\\s*\"([^\"]+)\"",
        RegexOptions.Compiled);

    public static List<Dictionary<string, object?>> Extract(string sourceText, string sourcePath)
    {
        var calls = new List<Dictionary<string, object?>>();
        var serviceHint = sourcePath.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        foreach (Match match in HttpCallRegex.Matches(sourceText))
        {
            calls.Add(new Dictionary<string, object?>
            {
                ["source_path"] = sourcePath.Replace('\\', '/'),
                ["method"] = match.Groups[1].Value.ToUpperInvariant(),
                ["path"] = match.Groups[2].Value,
                ["service_hint"] = serviceHint,
                ["callee_service_hint"] = "backend",
                ["client_kind"] = "httpclient",
            });
        }
        return calls;
    }
}
