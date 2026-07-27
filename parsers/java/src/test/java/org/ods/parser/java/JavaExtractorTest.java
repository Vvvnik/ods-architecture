package org.ods.parser.java;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JavaExtractorTest {
  @TempDir Path temp;

  @Test
  void extractsModuleNamespaceAndTopLevelTypesFromMain() throws Exception {
    write(
        "demo/src/main/java/com/example/App.java",
        """
        package com.example;
        public class App {
          class Nested {}
          private void hidden() {}
        }
        """);
    write(
        "demo/src/main/java/com/example/Api.java",
        """
        package com.example;
        public interface Api {}
        """);
    write(
        "demo/src/main/java/com/example/Kind.java",
        """
        package com.example;
        public enum Kind { A }
        """);
    write(
        "demo/src/test/java/com/example/AppTest.java",
        "package com.example; public class AppTest {}");

    JavaExtractor.Result result =
        JavaExtractor.extract(
            temp,
            List.of(
                "demo/src/main/java/com/example/App.java",
                "demo/src/main/java/com/example/Api.java",
                "demo/src/main/java/com/example/Kind.java",
                "demo/src/test/java/com/example/AppTest.java"));

    assertEquals(3, result.filesAnalyzed().size());
    assertTrue(result.symbols().stream().anyMatch(s -> "module".equals(s.get("kind"))));
    assertEquals(
        1,
        result.symbols().stream()
            .filter(
                s ->
                    "namespace".equals(s.get("kind"))
                        && "com.example".equals(s.get("qualified_name")))
            .count());
    assertTrue(
        result.symbols().stream()
            .anyMatch(s -> "class".equals(s.get("kind")) && "App".equals(s.get("name"))));
    assertTrue(
        result.symbols().stream()
            .anyMatch(
                s ->
                    "method".equals(s.get("kind"))
                        && "hidden".equals(s.get("name"))
                        && String.valueOf(s.get("qualified_name")).contains("App.hidden")));
    assertFalse(result.symbols().stream().anyMatch(s -> "Nested".equals(s.get("name"))));
    assertFalse(result.symbols().stream().anyMatch(s -> "AppTest".equals(s.get("name"))));
  }

  @Test
  void extractsInstanceStaticCrossModuleAndInterfaceCalls() throws Exception {
    seedCallsDemo(temp);
    List<String> files = listProductionJava(temp);
    JavaExtractor.Result result = JavaExtractor.extract(temp, files);

    List<Map<String, Object>> calls =
        result.usages().stream().filter(u -> "calls".equals(u.get("type"))).collect(Collectors.toList());

    assertTrue(
        calls.stream()
            .anyMatch(
                u ->
                    String.valueOf(u.get("from")).contains("Service.create")
                        && String.valueOf(u.get("to")).contains("Service.save")),
        "F1 instance create→save");
    assertTrue(
        calls.stream()
            .anyMatch(
                u ->
                    String.valueOf(u.get("from")).contains("Service.create")
                        && String.valueOf(u.get("to")).contains("Utils.stamp")),
        "F2 static Utils.stamp");
    assertTrue(
        calls.stream()
            .anyMatch(
                u ->
                    String.valueOf(u.get("from")).contains("Service.create")
                        && String.valueOf(u.get("to")).contains("BetaHelper.help")),
        "F3 cross-module");
    assertTrue(
        calls.stream()
            .anyMatch(
                u ->
                    String.valueOf(u.get("from")).contains("Service.create")
                        && String.valueOf(u.get("to")).contains("Clock.now")
                        && !String.valueOf(u.get("to")).contains("SystemClock")),
        "F4 interface Clock.now");
  }

  @Test
  void skipsAmbiguousUnresolvedAndTestOnlyCalls() throws Exception {
    seedCallsDemo(temp);
    List<String> files = listProductionJava(temp);
    files.add("module-alpha/src/test/java/ods/alpha/ServiceTest.java");
    JavaExtractor.Result result = JavaExtractor.extract(temp, files);

    List<Map<String, Object>> calls =
        result.usages().stream().filter(u -> "calls".equals(u.get("type"))).collect(Collectors.toList());

    assertFalse(
        calls.stream().anyMatch(u -> String.valueOf(u.get("from")).contains("Overloads.run")),
        "F5 ambiguous overload");
    assertFalse(
        calls.stream().anyMatch(u -> String.valueOf(u.get("path")).contains("src/test/java")),
        "F6 test path");
    assertFalse(
        calls.stream().anyMatch(u -> String.valueOf(u.get("from")).contains("ExternalCaller")),
        "F7 library println");
  }

  @Test
  void filtersGeneratedPaths() {
    assertTrue(JavaExtractor.isProductionJava("svc/src/main/java/A.java"));
    assertFalse(JavaExtractor.isProductionJava("svc/src/test/java/A.java"));
    assertTrue(JavaExtractor.isGenerated("svc/target/generated-sources/A.java"));
  }

  @Test
  void methodQnUsesSimpleParamNames() {
    assertEquals("String", JavaExtractor.simpleTypeName("java.lang.String"));
    assertEquals("int", JavaExtractor.simpleTypeName("int"));
  }

  private static void seedCallsDemo(Path root) throws Exception {
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/Service.java",
        """
        package ods.alpha;
        public class Service {
          private final Clock clock;
          private final ods.beta.BetaHelper helper = new ods.beta.BetaHelper();
          public Service(Clock clock) { this.clock = clock; }
          public void create() {
            save();
            Utils.stamp();
            helper.help();
            clock.now();
          }
          private void save() {}
        }
        """);
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/Utils.java",
        "package ods.alpha; public final class Utils { private Utils() {} public static void stamp() {} }");
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/Clock.java",
        "package ods.alpha; public interface Clock { long now(); }");
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/SystemClock.java",
        "package ods.alpha; public class SystemClock implements Clock { public long now() { return 1L; } }");
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/Overloads.java",
        """
        package ods.alpha;
        public class Overloads {
          public void run() { foo(null); }
          public void foo(String value) {}
          public void foo(Integer value) {}
        }
        """);
    write(
        root,
        "module-alpha/src/main/java/ods/alpha/ExternalCaller.java",
        "package ods.alpha; public class ExternalCaller { public void run() { System.out.println(\"x\"); } }");
    write(
        root,
        "module-beta/src/main/java/ods/beta/BetaHelper.java",
        "package ods.beta; public class BetaHelper { public void help() {} }");
    write(
        root,
        "module-alpha/src/test/java/ods/alpha/ServiceTest.java",
        "package ods.alpha; public class ServiceTest { public void testCreate() { new Service(new SystemClock()).create(); } }");
  }

  private static List<String> listProductionJava(Path root) throws Exception {
    List<String> files = new ArrayList<>();
    try (var walk = Files.walk(root)) {
      walk.filter(Files::isRegularFile)
          .map(p -> root.relativize(p).toString().replace('\\', '/'))
          .filter(JavaExtractor::isProductionJava)
          .forEach(files::add);
    }
    return files;
  }

  private void write(String relative, String content) throws Exception {
    write(temp, relative, content);
  }

  private static void write(Path root, String relative, String content) throws Exception {
    Path path = root.resolve(relative);
    Files.createDirectories(path.getParent());
    Files.writeString(path, content);
  }
}
