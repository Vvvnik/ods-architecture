using System.Text.Json;
var argsMap = new Dictionary<string,string>();
for (var i=0;i<args.Length-1;i++){ if(args[i].StartsWith("--")) argsMap[args[i][2..]]=args[i+1]; }
var files = argsMap.ContainsKey("files") ? JsonSerializer.Deserialize<List<string>>(argsMap["files"]) ?? [] : File.ReadAllLines(argsMap["file-list"]).Select(l=>l.Trim()).Where(l=>l.Length>0).ToList();
var calls = new List<Dictionary<string, object?>>();
foreach (var rel in files.Where(f => f.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))) {
  var text = await File.ReadAllTextAsync(Path.Combine(argsMap["working-copy-root"], rel));
  calls.AddRange(HttpCallsExtractor.Extract(text, rel));
}
var envelope = new Dictionary<string, object?> { ["parser_id"]="dotnet-http-calls", ["schema_version"]="1", ["project_id"]=argsMap["project-id"], ["analysis_run_id"]=argsMap["analysis-run-id"], ["generated_at"]=DateTime.UtcNow.ToString("O"), ["files_analyzed"]=files, ["model"]=new Dictionary<string, object?> { ["calls"] = calls } };
await File.WriteAllTextAsync(argsMap["output"], JsonSerializer.Serialize(envelope, new JsonSerializerOptions{WriteIndented=true}));
