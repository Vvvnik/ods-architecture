using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Ods.DotnetApiRoutesParser;

public static class ApiRoutesExtractor
{
    private static readonly Dictionary<string, string> HttpAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["HttpGet"] = "GET",
        ["HttpPost"] = "POST",
        ["HttpPut"] = "PUT",
        ["HttpPatch"] = "PATCH",
        ["HttpDelete"] = "DELETE",
        ["HttpHead"] = "HEAD",
        ["HttpOptions"] = "OPTIONS",
    };

    private static readonly Dictionary<string, string> MapMethods = new(StringComparer.Ordinal)
    {
        ["MapGet"] = "GET",
        ["MapPost"] = "POST",
        ["MapPut"] = "PUT",
        ["MapPatch"] = "PATCH",
        ["MapDelete"] = "DELETE",
        ["MapMethods"] = "",
    };

    public static List<ApiRoute> ExtractFiles(string workingCopyRoot, IReadOnlyList<string> relativePaths)
    {
        var routes = new List<ApiRoute>();
        foreach (var relative in relativePaths)
        {
            if (!relative.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var absolute = Path.Combine(workingCopyRoot, relative.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(absolute))
            {
                continue;
            }

            var text = File.ReadAllText(absolute);
            var tree = CSharpSyntaxTree.ParseText(text);
            var root = tree.GetCompilationUnitRoot();
            routes.AddRange(ExtractFromRoot(root, relative.Replace('\\', '/')));
        }

        return Dedup(routes);
    }

    private static IEnumerable<ApiRoute> ExtractFromRoot(CompilationUnitSyntax root, string sourcePath)
    {
        var serviceHint = ServiceHintFromPath(sourcePath);

        foreach (var type in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            var classRoute = JoinRoutes(
                type.AttributeLists.SelectMany(a => a.Attributes)
                    .Where(a => NameOf(a) is "Route" or "RouteAttribute")
                    .Select(a => FirstStringArg(a))
                    .Where(s => s != null)
                    .Cast<string>());

            foreach (var method in type.Members.OfType<MethodDeclarationSyntax>())
            {
                foreach (var attr in method.AttributeLists.SelectMany(a => a.Attributes))
                {
                    var name = NameOf(attr) ?? "";
                    if (name.EndsWith("Attribute", StringComparison.Ordinal))
                    {
                        name = name[..^"Attribute".Length];
                    }

                    if (!HttpAttributes.TryGetValue(name, out var httpMethod))
                    {
                        continue;
                    }

                    var methodRoute = FirstStringArg(attr) ?? "";
                    var path = CombineRoutes(classRoute, methodRoute);
                    if (string.IsNullOrWhiteSpace(path))
                    {
                        path = "/";
                    }

                    yield return new ApiRoute
                    {
                        Method = httpMethod,
                        Path = NormalizePath(path),
                        SourcePath = sourcePath,
                        Style = "controller",
                        HandlerName = method.Identifier.Text,
                        ServiceHint = serviceHint,
                        PathComplete = true,
                    };
                }
            }
        }

        foreach (var invocation in root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is not MemberAccessExpressionSyntax member)
            {
                continue;
            }

            var mapName = member.Name.Identifier.Text;
            if (!MapMethods.TryGetValue(mapName, out var httpMethod))
            {
                continue;
            }

            if (mapName == "MapMethods")
            {
                continue;
            }

            var pathArg = invocation.ArgumentList.Arguments.FirstOrDefault()?.Expression;
            var path = StringLiteral(pathArg);
            if (path == null)
            {
                continue;
            }

            string? handlerName = null;
            if (invocation.ArgumentList.Arguments.Count > 1)
            {
                handlerName = invocation.ArgumentList.Arguments[1].Expression switch
                {
                    IdentifierNameSyntax id => id.Identifier.Text,
                    MemberAccessExpressionSyntax ma => ma.Name.Identifier.Text,
                    _ => null,
                };
            }

            yield return new ApiRoute
            {
                Method = httpMethod,
                Path = NormalizePath(path),
                SourcePath = sourcePath,
                Style = "minimal",
                HandlerName = handlerName,
                ServiceHint = serviceHint,
                PathComplete = true,
            };
        }
    }

    private static string? NameOf(AttributeSyntax attr)
    {
        return attr.Name switch
        {
            IdentifierNameSyntax id => id.Identifier.Text,
            QualifiedNameSyntax q => q.Right.Identifier.Text,
            AliasQualifiedNameSyntax a => a.Name.Identifier.Text,
            _ => attr.Name.ToString(),
        };
    }

    private static string? FirstStringArg(AttributeSyntax attr)
    {
        var arg = attr.ArgumentList?.Arguments.FirstOrDefault()?.Expression;
        return StringLiteral(arg);
    }

    private static string? StringLiteral(ExpressionSyntax? expression)
    {
        return expression switch
        {
            LiteralExpressionSyntax lit when lit.IsKind(SyntaxKind.StringLiteralExpression)
                => lit.Token.ValueText,
            _ => null,
        };
    }

    private static string JoinRoutes(IEnumerable<string> parts)
    {
        return parts.Aggregate("", CombineRoutes);
    }

    private static string CombineRoutes(string prefix, string suffix)
    {
        var left = (prefix ?? "").Trim().TrimEnd('/');
        var right = (suffix ?? "").Trim().TrimStart('/');
        if (string.IsNullOrEmpty(left))
        {
            return string.IsNullOrEmpty(right) ? "" : "/" + right;
        }

        if (string.IsNullOrEmpty(right))
        {
            return left.StartsWith('/') ? left : "/" + left;
        }

        return (left.StartsWith('/') ? left : "/" + left) + "/" + right;
    }

    private static string NormalizePath(string path)
    {
        var trimmed = path.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return "/";
        }

        if (!trimmed.StartsWith('/'))
        {
            trimmed = "/" + trimmed;
        }

        while (trimmed.Contains("//", StringComparison.Ordinal))
        {
            trimmed = trimmed.Replace("//", "/", StringComparison.Ordinal);
        }

        return trimmed;
    }

    private static string? ServiceHintFromPath(string relativePath)
    {
        var skip = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "src", "lib", "app", "apps", "packages", "controllers", "routes", "handlers",
            "config", "configs", "settings", "contracts", "bin", "obj", "wwwroot",
        };
        var parts = relativePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        for (var i = 0; i < parts.Length - 1; i += 1)
        {
            var part = parts[i];
            if (skip.Contains(part) || part.Contains('.'))
            {
                continue;
            }

            return part.ToLowerInvariant();
        }

        return null;
    }

    private static List<ApiRoute> Dedup(List<ApiRoute> routes)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<ApiRoute>();
        foreach (var route in routes)
        {
            var key = $"{route.Method}|{route.Path}|{route.SourcePath}|{route.Style}";
            if (!seen.Add(key))
            {
                continue;
            }

            result.Add(route);
        }

        return result;
    }
}
