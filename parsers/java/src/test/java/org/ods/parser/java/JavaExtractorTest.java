package org.ods.parser.java;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

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
            .anyMatch(s -> "interface".equals(s.get("kind")) && "Api".equals(s.get("name"))));
    assertTrue(
        result.symbols().stream()
            .anyMatch(s -> "enum".equals(s.get("kind")) && "Kind".equals(s.get("name"))));
    assertFalse(result.symbols().stream().anyMatch(s -> "Nested".equals(s.get("name"))));
    assertFalse(result.symbols().stream().anyMatch(s -> "AppTest".equals(s.get("name"))));

    Map<String, Object> app =
        result.symbols().stream()
            .filter(s -> "App".equals(s.get("name")) && "class".equals(s.get("kind")))
            .findFirst()
            .orElseThrow();
    assertEquals("com.example", app.get("parent_qualified_name"));
  }

  @Test
  void filtersGeneratedPaths() {
    assertTrue(JavaExtractor.isProductionJava("svc/src/main/java/A.java"));
    assertFalse(JavaExtractor.isProductionJava("svc/src/test/java/A.java"));
    assertTrue(JavaExtractor.isGenerated("svc/target/generated-sources/A.java"));
  }

  private void write(String relative, String content) throws Exception {
    Path path = temp.resolve(relative);
    Files.createDirectories(path.getParent());
    Files.writeString(path, content);
  }
}
