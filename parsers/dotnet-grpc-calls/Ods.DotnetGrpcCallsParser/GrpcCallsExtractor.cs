public static class GrpcCallsExtractor
{
    public static List<Dictionary<string, object?>> Extract(string sourceText, string sourcePath)
    {
        var calls = new List<Dictionary<string, object?>>();
        var serviceHint = sourcePath.Replace('\\', '/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        var clientMatches = System.Text.RegularExpressions.Regex.Matches(
            sourceText,
            @"(?:var|[A-Za-z0-9_<>,\.\?]+)\s+([A-Za-z0-9_]+)\s*=\s*new\s+([A-Za-z0-9_]+)(?:\.[A-Za-z0-9_]+)?Client\s*\("
        );
        foreach (System.Text.RegularExpressions.Match client in clientMatches)
        {
            var variable = client.Groups[1].Value;
            var service = client.Groups[2].Value;
            if (string.IsNullOrWhiteSpace(variable) || string.IsNullOrWhiteSpace(service))
            {
                continue;
            }

            var methodMatches = System.Text.RegularExpressions.Regex.Matches(
                sourceText,
                $@"\b{System.Text.RegularExpressions.Regex.Escape(variable)}\s*\.\s*([A-Za-z0-9_]+?)(?:Async)?\s*\("
            );
            foreach (System.Text.RegularExpressions.Match methodMatch in methodMatches)
            {
                var method = methodMatch.Groups[1].Value;
                if (string.IsNullOrWhiteSpace(method))
                {
                    continue;
                }
                calls.Add(new Dictionary<string, object?>
                {
                    ["source_path"] = sourcePath.Replace('\\', '/'),
                    ["target_service"] = service,
                    ["target_method"] = method,
                    ["method"] = $"{service}/{method}",
                    ["service_hint"] = serviceHint,
                });
            }
        }
        return calls;
    }
}
