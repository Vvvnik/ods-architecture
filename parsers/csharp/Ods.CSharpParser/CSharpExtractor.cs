using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Ods.CSharpParser;

public static class CSharpExtractor
{
    public sealed record ExtractResult(List<Symbol> Symbols, List<Usage> Usages);

    public static ExtractResult ExtractFiles(string workingCopyRoot, IReadOnlyList<string> relativePaths)
    {
        var trees = new List<(string RelativePath, SyntaxTree Tree)>();
        foreach (var relativePath in relativePaths)
        {
            var posixPath = relativePath.Replace('\\', '/');
            var absolutePath = Path.Combine(workingCopyRoot, posixPath);
            var source = File.ReadAllText(absolutePath);
            var tree = CSharpSyntaxTree.ParseText(source, path: absolutePath);
            trees.Add((posixPath, tree));
        }

        var references = LoadMetadataReferences();

        var compilation = CSharpCompilation.Create(
            "OdsCSharpExtract",
            trees.Select(t => t.Tree),
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

        var symbols = new List<Symbol>();
        var usages = new List<Usage>();
        var qnBySymbol = new Dictionary<ISymbol, string>(SymbolEqualityComparer.Default);

        foreach (var (relativePath, tree) in trees)
        {
            var root = tree.GetCompilationUnitRoot();
            var model = compilation.GetSemanticModel(tree);

            symbols.Add(new Symbol
            {
                Name = Path.GetFileName(relativePath),
                Kind = "module",
                Path = relativePath,
                QualifiedName = relativePath,
                Location = ToLocation(root, tree),
                Refs = new List<SymbolRef>(),
            });

            var moduleSymbol = symbols[^1];
            var refs = (List<SymbolRef>)moduleSymbol.Refs!;

            foreach (var usingDirective in root.Usings)
            {
                var importName = usingDirective.Name?.ToString();
                if (string.IsNullOrWhiteSpace(importName))
                {
                    continue;
                }

                refs.Add(new SymbolRef
                {
                    Type = "imports",
                    Name = importName.Split('.')[^1],
                    Kind = "namespace",
                    QualifiedName = importName,
                });
            }

            VisitMembers(root.Members, relativePath, tree, model, parentQualifiedName: null, symbols, qnBySymbol);
        }

        foreach (var (relativePath, tree) in trees)
        {
            var root = tree.GetCompilationUnitRoot();
            var model = compilation.GetSemanticModel(tree);
            CollectUsages(root, relativePath, tree, model, qnBySymbol, usages);
        }

        return new ExtractResult(symbols, usages);
    }

    private static List<MetadataReference> LoadMetadataReferences()
    {
        var references = new List<MetadataReference>();
        var trusted = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string;
        if (!string.IsNullOrWhiteSpace(trusted))
        {
            foreach (var path in trusted.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
            {
                var name = Path.GetFileName(path);
                if (name.StartsWith("System.", StringComparison.Ordinal) ||
                    name.Equals("mscorlib.dll", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals("netstandard.dll", StringComparison.OrdinalIgnoreCase))
                {
                    references.Add(MetadataReference.CreateFromFile(path));
                }
            }
        }

        if (references.Count == 0)
        {
            references.Add(MetadataReference.CreateFromFile(typeof(object).Assembly.Location));
        }

        return references;
    }

    private static void VisitMembers(
        SyntaxList<MemberDeclarationSyntax> members,
        string relativePath,
        SyntaxTree tree,
        SemanticModel model,
        string? parentQualifiedName,
        List<Symbol> symbols,
        Dictionary<ISymbol, string> qnBySymbol)
    {
        foreach (var member in members)
        {
            VisitMember(member, relativePath, tree, model, parentQualifiedName, symbols, qnBySymbol);
        }
    }

    private static void VisitMember(
        MemberDeclarationSyntax member,
        string relativePath,
        SyntaxTree tree,
        SemanticModel model,
        string? parentQualifiedName,
        List<Symbol> symbols,
        Dictionary<ISymbol, string> qnBySymbol)
    {
        switch (member)
        {
            case NamespaceDeclarationSyntax namespaceDecl:
            {
                var nsFullName = namespaceDecl.Name.ToString();
                var qualifiedName = Qualify(parentQualifiedName, nsFullName);
                AddSymbol(nsFullName.Split('.')[^1], "namespace", relativePath, qualifiedName, parentQualifiedName, namespaceDecl, tree, model, symbols, qnBySymbol);
                VisitMembers(namespaceDecl.Members, relativePath, tree, model, qualifiedName, symbols, qnBySymbol);
                break;
            }
            case FileScopedNamespaceDeclarationSyntax fileScopedNamespace:
            {
                var qualifiedName = Qualify(parentQualifiedName, fileScopedNamespace.Name.ToString());
                AddSymbol(fileScopedNamespace.Name.ToString().Split('.')[^1], "namespace", relativePath, qualifiedName, parentQualifiedName, fileScopedNamespace, tree, model, symbols, qnBySymbol);
                VisitMembers(fileScopedNamespace.Members, relativePath, tree, model, qualifiedName, symbols, qnBySymbol);
                break;
            }
            case ClassDeclarationSyntax classDecl:
                VisitTypeDeclaration(classDecl.Identifier.Text, "class", classDecl, classDecl.BaseList, classDecl.Members, relativePath, tree, model, parentQualifiedName, symbols, qnBySymbol);
                break;
            case RecordDeclarationSyntax recordDecl:
                VisitTypeDeclaration(recordDecl.Identifier.Text, "class", recordDecl, recordDecl.BaseList, recordDecl.Members, relativePath, tree, model, parentQualifiedName, symbols, qnBySymbol);
                break;
            case InterfaceDeclarationSyntax interfaceDecl:
                VisitTypeDeclaration(interfaceDecl.Identifier.Text, "interface", interfaceDecl, interfaceDecl.BaseList, interfaceDecl.Members, relativePath, tree, model, parentQualifiedName, symbols, qnBySymbol);
                break;
            case EnumDeclarationSyntax enumDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, enumDecl.Identifier.Text);
                AddSymbol(enumDecl.Identifier.Text, "enum", relativePath, qualifiedName, parentQualifiedName, enumDecl, tree, model, symbols, qnBySymbol);
                break;
            }
            case MethodDeclarationSyntax methodDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, methodDecl.Identifier.Text);
                AddSymbol(
                    methodDecl.Identifier.Text,
                    "method",
                    relativePath,
                    qualifiedName,
                    parentQualifiedName,
                    methodDecl,
                    tree,
                    model,
                    symbols,
                    qnBySymbol,
                    methodDecl.ParameterList.ToString());
                break;
            }
            case PropertyDeclarationSyntax propertyDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, propertyDecl.Identifier.Text);
                AddSymbol(propertyDecl.Identifier.Text, "property", relativePath, qualifiedName, parentQualifiedName, propertyDecl, tree, model, symbols, qnBySymbol);
                break;
            }
            case FieldDeclarationSyntax fieldDecl:
            {
                foreach (var variable in fieldDecl.Declaration.Variables)
                {
                    var qualifiedName = Qualify(parentQualifiedName, variable.Identifier.Text);
                    AddSymbol(variable.Identifier.Text, "field", relativePath, qualifiedName, parentQualifiedName, variable, tree, model, symbols, qnBySymbol);
                }
                break;
            }
            case ConstructorDeclarationSyntax ctorDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, ctorDecl.Identifier.Text);
                AddSymbol(
                    ctorDecl.Identifier.Text,
                    "method",
                    relativePath,
                    qualifiedName,
                    parentQualifiedName,
                    ctorDecl,
                    tree,
                    model,
                    symbols,
                    qnBySymbol,
                    ctorDecl.ParameterList.ToString());
                break;
            }
            case GlobalStatementSyntax:
                break;
        }
    }

    private static void VisitTypeDeclaration(
        string name,
        string kind,
        TypeDeclarationSyntax declaration,
        BaseListSyntax? baseList,
        SyntaxList<MemberDeclarationSyntax> members,
        string relativePath,
        SyntaxTree tree,
        SemanticModel model,
        string? parentQualifiedName,
        List<Symbol> symbols,
        Dictionary<ISymbol, string> qnBySymbol)
    {
        var qualifiedName = Qualify(parentQualifiedName, name);
        var typeRefs = BuildBaseRefs(baseList);
        AddSymbol(name, kind, relativePath, qualifiedName, parentQualifiedName, declaration, tree, model, symbols, qnBySymbol, refs: typeRefs);
        VisitMembers(members, relativePath, tree, model, qualifiedName, symbols, qnBySymbol);
    }

    private static List<SymbolRef> BuildBaseRefs(BaseListSyntax? baseList)
    {
        var refs = new List<SymbolRef>();
        if (baseList is null)
        {
            return refs;
        }

        for (var index = 0; index < baseList.Types.Count; index += 1)
        {
            var typeSyntax = baseList.Types[index];
            var typeName = typeSyntax.Type.ToString();
            if (string.IsNullOrWhiteSpace(typeName))
            {
                continue;
            }

            refs.Add(new SymbolRef
            {
                Type = index == 0 ? "inherits" : "implements",
                Name = typeName.Split('.')[^1],
                Kind = "class",
                QualifiedName = typeName,
            });
        }

        return refs;
    }

    private static void CollectUsages(
        CompilationUnitSyntax root,
        string relativePath,
        SyntaxTree tree,
        SemanticModel model,
        Dictionary<ISymbol, string> qnBySymbol,
        List<Usage> usages)
    {
        foreach (var invocation in root.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var enclosing = FindEnclosingMethodQn(invocation, model, qnBySymbol);
            if (enclosing is null)
            {
                continue;
            }

            var info = model.GetSymbolInfo(invocation);
            IMethodSymbol? method = info.Symbol as IMethodSymbol;
            if (method is null && info.CandidateSymbols.Length == 1)
            {
                method = info.CandidateSymbols[0] as IMethodSymbol;
            }

            if (method is null || !TryResolveMethodQn(method, qnBySymbol, out var toQn))
            {
                continue;
            }

            usages.Add(new Usage
            {
                From = enclosing,
                To = toQn,
                Type = "calls",
                Path = relativePath,
                Location = ToLocation(invocation, tree),
            });
        }

        foreach (var typeDecl in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
        {
            if (!TryGetDeclaredQn(typeDecl, model, qnBySymbol, out var fromQn))
            {
                continue;
            }

            foreach (var ctor in typeDecl.Members.OfType<ConstructorDeclarationSyntax>())
            {
                foreach (var parameter in ctor.ParameterList.Parameters)
                {
                    if (parameter.Type is null)
                    {
                        continue;
                    }

                    var typeInfo = model.GetTypeInfo(parameter.Type);
                    if (typeInfo.Type is not INamedTypeSymbol typeSymbol ||
                        typeSymbol.TypeKind is TypeKind.Error or TypeKind.Unknown ||
                        typeSymbol.SpecialType != SpecialType.None)
                    {
                        continue;
                    }

                    if (!TryResolveTypeQn(typeSymbol, qnBySymbol, out var toQn))
                    {
                        continue;
                    }

                    usages.Add(new Usage
                    {
                        From = fromQn,
                        To = toQn,
                        Type = "injects",
                        Path = relativePath,
                        Location = ToLocation(parameter, tree),
                        Metadata = new Dictionary<string, object>
                        {
                            ["parameter"] = parameter.Identifier.Text,
                            ["constructor"] = true,
                        },
                    });
                }
            }
        }
    }

    private static string? FindEnclosingMethodQn(
        SyntaxNode node,
        SemanticModel model,
        Dictionary<ISymbol, string> qnBySymbol)
    {
        for (var current = node.Parent; current is not null; current = current.Parent)
        {
            if (current is MethodDeclarationSyntax or ConstructorDeclarationSyntax or LocalFunctionStatementSyntax)
            {
                var declared = model.GetDeclaredSymbol(current);
                if (declared is not null && qnBySymbol.TryGetValue(declared, out var qn))
                {
                    return qn;
                }
            }
        }

        return null;
    }

    private static bool TryGetDeclaredQn(
        SyntaxNode node,
        SemanticModel model,
        Dictionary<ISymbol, string> qnBySymbol,
        out string qn)
    {
        qn = "";
        var declared = model.GetDeclaredSymbol(node);
        return declared is not null && qnBySymbol.TryGetValue(declared, out qn!);
    }

    private static bool TryResolveMethodQn(
        IMethodSymbol method,
        Dictionary<ISymbol, string> qnBySymbol,
        out string qn)
    {
        if (qnBySymbol.TryGetValue(method, out qn!))
        {
            return true;
        }

        return qnBySymbol.TryGetValue(method.OriginalDefinition, out qn!);
    }

    private static bool TryResolveTypeQn(
        INamedTypeSymbol typeSymbol,
        Dictionary<ISymbol, string> qnBySymbol,
        out string qn)
    {
        if (qnBySymbol.TryGetValue(typeSymbol, out qn!))
        {
            return true;
        }

        return qnBySymbol.TryGetValue(typeSymbol.OriginalDefinition, out qn!);
    }

    private static void AddSymbol(
        string name,
        string kind,
        string relativePath,
        string qualifiedName,
        string? parentQualifiedName,
        SyntaxNode node,
        SyntaxTree tree,
        SemanticModel model,
        List<Symbol> symbols,
        Dictionary<ISymbol, string> qnBySymbol,
        string? signature = null,
        List<SymbolRef>? refs = null)
    {
        symbols.Add(new Symbol
        {
            Name = name,
            Kind = kind,
            Path = relativePath,
            QualifiedName = qualifiedName,
            ParentQualifiedName = parentQualifiedName,
            Signature = signature,
            Location = ToLocation(node, tree),
            Refs = refs,
        });

        var declared = model.GetDeclaredSymbol(node);
        if (declared is not null)
        {
            qnBySymbol[declared] = qualifiedName;
        }
    }

    private static string Qualify(string? parent, string name) =>
        string.IsNullOrWhiteSpace(parent) ? name : $"{parent}.{name}";

    private static Location ToLocation(SyntaxNode node, SyntaxTree tree)
    {
        var span = node.Span;
        var start = tree.GetLineSpan(span).StartLinePosition;
        var end = tree.GetLineSpan(span).EndLinePosition;
        return new Location
        {
            StartLine = start.Line + 1,
            StartCol = start.Character,
            EndLine = end.Line + 1,
            EndCol = end.Character,
        };
    }
}
