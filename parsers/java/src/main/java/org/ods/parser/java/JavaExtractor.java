package org.ods.parser.java;

import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.PackageDeclaration;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.body.TypeDeclaration;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.SuperExpr;
import com.github.javaparser.resolution.declarations.ResolvedMethodDeclaration;
import com.github.javaparser.resolution.types.ResolvedType;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

final class JavaExtractor {
  private JavaExtractor() {}

  record Result(
      List<Map<String, Object>> symbols, List<Map<String, Object>> usages, List<String> filesAnalyzed) {}

  static Result extract(Path workingCopyRoot, List<String> relativePaths) {
    configureSymbolSolver(workingCopyRoot);

    List<Map<String, Object>> symbols = new ArrayList<>();
    List<Map<String, Object>> usages = new ArrayList<>();
    List<String> analyzed = new ArrayList<>();
    Set<String> emittedPackages = new LinkedHashSet<>();
    Set<String> methodQns = new LinkedHashSet<>();
    List<ParsedFile> parsedFiles = new ArrayList<>();

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
        parsedFiles.add(new ParsedFile(posix, cu));

        String fileName = Path.of(posix).getFileName().toString();
        Map<String, Object> module = new LinkedHashMap<>();
        module.put("name", fileName);
        module.put("kind", "module");
        module.put("path", posix);
        module.put("qualified_name", posix);
        symbols.add(module);

        String packageFqn =
            cu.getPackageDeclaration().map(PackageDeclaration::getNameAsString).orElse(null);

        if (packageFqn != null && !packageFqn.isBlank() && emittedPackages.add(packageFqn)) {
          Map<String, Object> ns = new LinkedHashMap<>();
          String last =
              packageFqn.contains(".")
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
          String typeQn =
              packageFqn == null || packageFqn.isBlank() ? simpleName : packageFqn + "." + simpleName;

          Map<String, Object> symbol = new LinkedHashMap<>();
          symbol.put("name", simpleName);
          symbol.put("kind", kind);
          symbol.put("path", posix);
          symbol.put("qualified_name", typeQn);
          if (packageFqn != null && !packageFqn.isBlank()) {
            symbol.put("parent_qualified_name", packageFqn);
          }
          putLocation(symbol, type);
          symbols.add(symbol);

          for (MethodDeclaration method : type.getMethods()) {
            String methodQn = methodQualifiedName(typeQn, method);
            methodQns.add(methodQn);
            Map<String, Object> methodSymbol = new LinkedHashMap<>();
            methodSymbol.put("name", method.getNameAsString());
            methodSymbol.put("kind", "method");
            methodSymbol.put("path", posix);
            methodSymbol.put("qualified_name", methodQn);
            methodSymbol.put("parent_qualified_name", typeQn);
            methodSymbol.put("signature", methodQn.substring(methodQn.indexOf('(')));
            putLocation(methodSymbol, method);
            symbols.add(methodSymbol);
          }
        }
      } catch (Exception ex) {
        System.err.println("java parser skip " + posix + ": " + ex.getMessage());
      }
    }

    for (ParsedFile parsed : parsedFiles) {
      collectUsages(parsed.path(), parsed.cu(), methodQns, usages);
    }

    return new Result(symbols, usages, analyzed);
  }

  private static void collectUsages(
      String path,
      CompilationUnit cu,
      Set<String> methodQns,
      List<Map<String, Object>> usages) {
    for (MethodCallExpr call : cu.findAll(MethodCallExpr.class)) {
      if (isSuperCall(call)) {
        continue;
      }
      Optional<MethodDeclaration> enclosing = call.findAncestor(MethodDeclaration.class);
      if (enclosing.isEmpty()) {
        continue;
      }
      MethodDeclaration callerMethod = enclosing.get();
      Optional<TypeDeclaration<?>> callerType =
          callerMethod.findAncestor(TypeDeclaration.class).map(t -> (TypeDeclaration<?>) t);
      if (callerType.isEmpty() || resolveTopLevelKind(callerType.get()) == null) {
        continue;
      }
      if (!callerType.get().isTopLevelType()) {
        continue;
      }

      String packageFqn =
          cu.getPackageDeclaration().map(PackageDeclaration::getNameAsString).orElse(null);
      String typeQn = typeQualifiedName(packageFqn, callerType.get().getNameAsString());
      String fromQn = methodQualifiedName(typeQn, callerMethod);
      if (!methodQns.contains(fromQn)) {
        continue;
      }

      String toQn = resolveCalleeQn(call);
      if (toQn == null || !methodQns.contains(toQn) || fromQn.equals(toQn)) {
        continue;
      }

      Map<String, Object> usage = new LinkedHashMap<>();
      usage.put("from", fromQn);
      usage.put("to", toQn);
      usage.put("type", "calls");
      usage.put("path", path);
      putLocation(usage, call);
      usages.add(usage);
    }
  }

  private static String resolveCalleeQn(MethodCallExpr call) {
    try {
      ResolvedMethodDeclaration resolved = call.resolve();
      return methodQualifiedName(resolved);
    } catch (Exception ex) {
      // unresolved / ambiguous → skip (FR-006)
      return null;
    }
  }

  private static boolean isSuperCall(MethodCallExpr call) {
    Optional<Expression> scope = call.getScope();
    return scope.isPresent() && scope.get() instanceof SuperExpr;
  }

  private static String typeQualifiedName(String packageFqn, String simpleName) {
    if (packageFqn == null || packageFqn.isBlank()) {
      return simpleName;
    }
    return packageFqn + "." + simpleName;
  }

  static String methodQualifiedName(String typeQn, MethodDeclaration method) {
    StringBuilder sb = new StringBuilder(typeQn).append('.').append(method.getNameAsString()).append('(');
    List<Parameter> params = method.getParameters();
    for (int i = 0; i < params.size(); i++) {
      if (i > 0) {
        sb.append(',');
      }
      sb.append(simpleTypeName(params.get(i).getType().asString()));
    }
    sb.append(')');
    return sb.toString();
  }

  static String methodQualifiedName(ResolvedMethodDeclaration decl) {
    String typeQn = decl.declaringType().getQualifiedName();
    StringBuilder sb = new StringBuilder(typeQn).append('.').append(decl.getName()).append('(');
    for (int i = 0; i < decl.getNumberOfParams(); i++) {
      if (i > 0) {
        sb.append(',');
      }
      ResolvedType paramType = decl.getParam(i).getType();
      sb.append(simpleTypeName(paramType.describe()));
    }
    sb.append(')');
    return sb.toString();
  }

  static String simpleTypeName(String typeName) {
    String trimmed = typeName.replace(" ", "");
    int generic = trimmed.indexOf('<');
    if (generic >= 0) {
      trimmed = trimmed.substring(0, generic);
    }
    if (trimmed.endsWith("...")) {
      trimmed = trimmed.substring(0, trimmed.length() - 3) + "[]";
    }
    int dot = trimmed.lastIndexOf('.');
    return dot >= 0 ? trimmed.substring(dot + 1) : trimmed;
  }

  private static void configureSymbolSolver(Path workingCopyRoot) {
    CombinedTypeSolver combined = new CombinedTypeSolver();
    combined.add(new ReflectionTypeSolver(false));
    for (Path sourceRoot : discoverMainJavaRoots(workingCopyRoot)) {
      combined.add(new JavaParserTypeSolver(sourceRoot));
    }
    ParserConfiguration config = new ParserConfiguration();
    config.setSymbolResolver(new JavaSymbolSolver(combined));
    StaticJavaParser.setConfiguration(config);
  }

  static List<Path> discoverMainJavaRoots(Path workingCopyRoot) {
    List<Path> roots = new ArrayList<>();
    if (!Files.isDirectory(workingCopyRoot)) {
      return roots;
    }
    try (Stream<Path> walk = Files.walk(workingCopyRoot)) {
      walk.filter(Files::isDirectory)
          .filter(
              p -> {
                String posix = workingCopyRoot.relativize(p).toString().replace('\\', '/');
                return posix.equals("src/main/java") || posix.endsWith("/src/main/java");
              })
          .forEach(roots::add);
    } catch (IOException ex) {
      System.err.println("java parser: cannot walk WC for source roots: " + ex.getMessage());
    }
    return roots;
  }

  static boolean isProductionJava(String posixPath) {
    return posixPath.contains("/src/main/java/") || posixPath.startsWith("src/main/java/");
  }

  static boolean isGenerated(String posixPath) {
    return posixPath.contains("/target/generated-sources/")
        || posixPath.contains("/build/generated/");
  }

  private static String resolveTopLevelKind(TypeDeclaration<?> type) {
    if (!type.isTopLevelType()) {
      return null;
    }
    if (type instanceof ClassOrInterfaceDeclaration cid) {
      return cid.isInterface() ? "interface" : "class";
    }
    if (type instanceof EnumDeclaration) {
      return "enum";
    }
    return null;
  }

  private static void putLocation(Map<String, Object> target, com.github.javaparser.ast.Node node) {
    node.getRange()
        .ifPresent(
            range -> {
              Map<String, Object> location = new LinkedHashMap<>();
              location.put("start_line", range.begin.line);
              location.put("start_col", range.begin.column - 1);
              location.put("end_line", range.end.line);
              location.put("end_col", range.end.column);
              target.put("location", location);
            });
  }

  private record ParsedFile(String path, CompilationUnit cu) {}
}
