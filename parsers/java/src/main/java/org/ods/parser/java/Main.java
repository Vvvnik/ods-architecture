package org.ods.parser.java;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
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
    boolean worker = parsed.containsKey("ods-worker");

    List<String> required = worker
        ? List.of("project-id", "working-copy-root", "analysis-run-id")
        : List.of("project-id", "working-copy-root", "analysis-run-id", "output");
    for (String key : required) {
      if (!parsed.containsKey(key) || parsed.get(key).isBlank()) {
        System.err.println("Missing required argument: --" + key);
        System.exit(1);
      }
    }

    if (worker) {
      runWorker(parsed);
      return;
    }

    Path workingCopyRoot = Path.of(parsed.get("working-copy-root"));
    List<String> files = resolveFiles(parsed);
    Map<String, Object> envelope = buildEnvelope(
        parsed.get("project-id"),
        parsed.get("analysis-run-id"),
        workingCopyRoot,
        files);
    Path output = Path.of(parsed.get("output"));
    if (output.getParent() != null) {
      Files.createDirectories(output.getParent());
    }
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    Files.writeString(output, gson.toJson(envelope));
  }

  private static void runWorker(Map<String, String> parsed) throws Exception {
    Path workingCopyRoot = Path.of(parsed.get("working-copy-root"));
    String projectId = parsed.get("project-id");
    String analysisRunId = parsed.get("analysis-run-id");
    Gson gson = new GsonBuilder().create();

    System.out.println(gson.toJson(Map.of("op", "ready")));
    System.out.flush();

    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String trimmed = line.trim();
        if (trimmed.isEmpty()) {
          continue;
        }
        JsonObject msg;
        try {
          msg = JsonParser.parseString(trimmed).getAsJsonObject();
        } catch (Exception ex) {
          System.out.println(gson.toJson(Map.of(
              "op", "chunk_result",
              "chunk_index", -1,
              "status", "error",
              "message", "invalid JSON")));
          System.out.flush();
          continue;
        }
        String op = msg.has("op") ? msg.get("op").getAsString() : "";
        if ("shutdown".equals(op)) {
          System.out.println(gson.toJson(Map.of("op", "bye")));
          System.out.flush();
          return;
        }
        if (!"chunk".equals(op)) {
          System.out.println(gson.toJson(Map.of(
              "op", "chunk_result",
              "chunk_index", msg.has("chunk_index") ? msg.get("chunk_index").getAsInt() : -1,
              "status", "error",
              "message", "unknown op: " + op)));
          System.out.flush();
          continue;
        }
        int chunkIndex = msg.get("chunk_index").getAsInt();
        try {
          Path fileList = Path.of(msg.get("file_list").getAsString());
          Path output = Path.of(msg.get("output").getAsString());
          List<String> files = new ArrayList<>();
          for (String row : Files.readAllLines(fileList)) {
            String t = row.trim();
            if (!t.isEmpty()) {
              files.add(t);
            }
          }
          Map<String, Object> envelope = buildEnvelope(projectId, analysisRunId, workingCopyRoot, files);
          if (output.getParent() != null) {
            Files.createDirectories(output.getParent());
          }
          Files.writeString(output, new GsonBuilder().setPrettyPrinting().create().toJson(envelope));
          Map<String, Object> ok = new LinkedHashMap<>();
          ok.put("op", "chunk_result");
          ok.put("chunk_index", chunkIndex);
          ok.put("status", "ok");
          ok.put("output", output.toString());
          System.out.println(gson.toJson(ok));
          System.out.flush();
        } catch (Exception ex) {
          Map<String, Object> err = new LinkedHashMap<>();
          err.put("op", "chunk_result");
          err.put("chunk_index", chunkIndex);
          err.put("status", "error");
          err.put("message", ex.getMessage() != null ? ex.getMessage() : "chunk failed");
          System.out.println(gson.toJson(err));
          System.out.flush();
        }
      }
    }
  }

  private static Map<String, Object> buildEnvelope(
      String projectId,
      String analysisRunId,
      Path workingCopyRoot,
      List<String> files) throws Exception {
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
    envelope.put("project_id", projectId);
    envelope.put("analysis_run_id", analysisRunId);
    envelope.put("generated_at", Instant.now().toString());
    envelope.put("files_analyzed", extract.filesAnalyzed());
    envelope.put("model", model);
    return envelope;
  }

  private static Map<String, String> parseArgs(String[] argv) {
    Map<String, String> args = new HashMap<>();
    for (int i = 0; i < argv.length; i += 1) {
      String key = argv[i];
      if (!key.startsWith("--")) {
        continue;
      }
      String name = key.substring(2);
      if ("ods-worker".equals(name)) {
        args.put(name, "true");
        continue;
      }
      if (i + 1 >= argv.length) {
        continue;
      }
      args.put(name, argv[i + 1]);
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
