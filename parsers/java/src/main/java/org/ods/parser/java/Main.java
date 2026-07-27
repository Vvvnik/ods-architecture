package org.ods.parser.java;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Main {
  private Main() {}

  public static void main(String[] args) throws Exception {
    Map<String, String> parsed = parseArgs(args);
    for (String key : List.of("project-id", "working-copy-root", "analysis-run-id", "output")) {
      if (!parsed.containsKey(key) || parsed.get(key).isBlank()) {
        System.err.println("Missing required argument: --" + key);
        System.exit(1);
      }
    }

    Path workingCopyRoot = Path.of(parsed.get("working-copy-root"));
    List<String> files = resolveFiles(parsed);

    List<String> posixFiles = new ArrayList<>();
    for (String file : files) {
      posixFiles.add(file.replace('\\', '/'));
    }

    JavaExtractor.Result extract = JavaExtractor.extract(workingCopyRoot, posixFiles);

    Map<String, Object> model = new LinkedHashMap<>();
    model.put("symbols", extract.symbols());
    model.put("usages", extract.usages());

    Map<String, Object> envelope = new LinkedHashMap<>();
    envelope.put("parser_id", "java");
    envelope.put("schema_version", "2");
    envelope.put("project_id", parsed.get("project-id"));
    envelope.put("analysis_run_id", parsed.get("analysis-run-id"));
    envelope.put("generated_at", Instant.now().toString());
    envelope.put("files_analyzed", extract.filesAnalyzed());
    envelope.put("model", model);

    Path output = Path.of(parsed.get("output"));
    if (output.getParent() != null) {
      Files.createDirectories(output.getParent());
    }
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    Files.writeString(output, gson.toJson(envelope));
  }

  private static Map<String, String> parseArgs(String[] argv) {
    Map<String, String> args = new HashMap<>();
    for (int i = 0; i < argv.length; i += 1) {
      String key = argv[i];
      if (!key.startsWith("--") || i + 1 >= argv.length) {
        continue;
      }
      args.put(key.substring(2), argv[i + 1]);
      i += 1;
    }
    return args;
  }

  @SuppressWarnings("unchecked")
  private static List<String> resolveFiles(Map<String, String> parsed) throws Exception {
    if (parsed.containsKey("files") && parsed.get("files") != null && !parsed.get("files").isBlank()) {
      List<String> files = new Gson().fromJson(parsed.get("files"), List.class);
      return files != null ? files : List.of();
    }
    if (parsed.containsKey("file-list") && parsed.get("file-list") != null && !parsed.get("file-list").isBlank()) {
      List<String> files = new ArrayList<>();
      for (String line : Files.readAllLines(Path.of(parsed.get("file-list")))) {
        String trimmed = line.trim();
        if (!trimmed.isEmpty()) {
          files.add(trimmed);
        }
      }
      return files;
    }
    System.err.println("Missing required argument: --files or --file-list");
    System.exit(1);
    return List.of();
  }
}
