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
    for (String key : List.of("project-id", "working-copy-root", "analysis-run-id", "files", "output")) {
      if (!parsed.containsKey(key) || parsed.get(key).isBlank()) {
        System.err.println("Missing required argument: --" + key);
        System.exit(1);
      }
    }

    Path workingCopyRoot = Path.of(parsed.get("working-copy-root"));
    @SuppressWarnings("unchecked")
    List<String> files = new Gson().fromJson(parsed.get("files"), List.class);
    if (files == null) {
      files = List.of();
    }

    List<String> posixFiles = new ArrayList<>();
    for (String file : files) {
      posixFiles.add(file.replace('\\', '/'));
    }

    JavaExtractor.Result extract = JavaExtractor.extract(workingCopyRoot, posixFiles);

    Map<String, Object> envelope = new LinkedHashMap<>();
    envelope.put("parser_id", "java");
    envelope.put("schema_version", "1");
    envelope.put("project_id", parsed.get("project-id"));
    envelope.put("analysis_run_id", parsed.get("analysis-run-id"));
    envelope.put("generated_at", Instant.now().toString());
    envelope.put("files_analyzed", extract.filesAnalyzed());
    envelope.put("model", Map.of("symbols", extract.symbols()));

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
}
