package org.ods.parser.java;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.PackageDeclaration;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.TypeDeclaration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class JavaExtractor {
  private JavaExtractor() {}

  record Result(List<Map<String, Object>> symbols, List<String> filesAnalyzed) {}

  static Result extract(Path workingCopyRoot, List<String> relativePaths) {
    List<Map<String, Object>> symbols = new ArrayList<>();
    List<String> analyzed = new ArrayList<>();
    Set<String> emittedPackages = new LinkedHashSet<>();

    for (String relativePath : relativePaths) {
      String posix = relativePath.replace('\\', '/');
      if (!isProductionJava(posix) || isGenerated(posix)) {
        continue;
      }
      Path absolute = workingCopyRoot.resolve(posix);
      if (!Files.isRegularFile(absolute)) {
        continue;
      }

      try {
        CompilationUnit cu = StaticJavaParser.parse(absolute);
        analyzed.add(posix);

        String fileName = Path.of(posix).getFileName().toString();
        Map<String, Object> module = new LinkedHashMap<>();
        module.put("name", fileName);
        module.put("kind", "module");
        module.put("path", posix);
        module.put("qualified_name", posix);
        symbols.add(module);

        String packageFqn = cu.getPackageDeclaration()
            .map(PackageDeclaration::getNameAsString)
            .orElse(null);

        if (packageFqn != null && !packageFqn.isBlank() && emittedPackages.add(packageFqn)) {
          Map<String, Object> ns = new LinkedHashMap<>();
          String last = packageFqn.contains(".")
              ? packageFqn.substring(packageFqn.lastIndexOf('.') + 1)
              : packageFqn;
          ns.put("name", last);
          ns.put("kind", "namespace");
          ns.put("path", "java-package/" + packageFqn.replace('.', '/'));
          ns.put("qualified_name", packageFqn);
          symbols.add(ns);
        }

        for (TypeDeclaration<?> type : cu.getTypes()) {
          String kind = resolveTopLevelKind(type);
          if (kind == null) {
            continue;
          }
          String simpleName = type.getNameAsString();
          String typeQn = packageFqn == null || packageFqn.isBlank()
              ? simpleName
              : packageFqn + "." + simpleName;

          Map<String, Object> symbol = new LinkedHashMap<>();
          symbol.put("name", simpleName);
          symbol.put("kind", kind);
          symbol.put("path", posix);
          symbol.put("qualified_name", typeQn);
          if (packageFqn != null && !packageFqn.isBlank()) {
            symbol.put("parent_qualified_name", packageFqn);
          }
          type.getRange().ifPresent(range -> {
            Map<String, Object> location = new LinkedHashMap<>();
            location.put("start_line", range.begin.line);
            location.put("start_col", range.begin.column - 1);
            location.put("end_line", range.end.line);
            location.put("end_col", range.end.column);
            symbol.put("location", location);
          });
          symbols.add(symbol);
        }
      } catch (Exception ex) {
        System.err.println("java parser skip " + posix + ": " + ex.getMessage());
      }
    }

    return new Result(symbols, analyzed);
  }

  static boolean isProductionJava(String posixPath) {
    return posixPath.contains("/src/main/java/") || posixPath.startsWith("src/main/java/");
  }

  static boolean isGenerated(String posixPath) {
    return posixPath.contains("/target/generated-sources/")
        || posixPath.contains("/build/generated/");
  }

  private static String resolveTopLevelKind(TypeDeclaration<?> type) {
    if (type instanceof ClassOrInterfaceDeclaration cid) {
      return cid.isInterface() ? "interface" : "class";
    }
    if (type instanceof EnumDeclaration) {
      return "enum";
    }
    return null;
  }
}
