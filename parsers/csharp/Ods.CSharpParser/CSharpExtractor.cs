using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Ods.CSharpParser;

public static class CSharpExtractor
{
    public static List<Symbol> ExtractFile(string relativePath, string absolutePath)
    {
        var source = File.ReadAllText(absolutePath);
        var tree = CSharpSyntaxTree.ParseText(source, path: absolutePath);
        var root = tree.GetCompilationUnitRoot();
        var symbols = new List<Symbol>();

        symbols.Add(new Symbol
        {
            Name = Path.GetFileName(relativePath),
            Kind = "module",
            Path = relativePath,
            QualifiedName = relativePath,
            Location = ToLocation(root, tree),
            Refs = new List<SymbolRef>(),
        });

        var moduleSymbol = symbols[0];
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

        VisitMembers(root.Members, relativePath, tree, parentQualifiedName: null, symbols);
        return symbols;
    }

    private static void VisitMembers(
        SyntaxList<MemberDeclarationSyntax> members,
        string relativePath,
        SyntaxTree tree,
        string? parentQualifiedName,
        List<Symbol> symbols)
    {
        foreach (var member in members)
        {
            VisitMember(member, relativePath, tree, parentQualifiedName, symbols);
        }
    }

    private static void VisitMember(
        MemberDeclarationSyntax member,
        string relativePath,
        SyntaxTree tree,
        string? parentQualifiedName,
        List<Symbol> symbols)
    {
        switch (member)
        {
            case NamespaceDeclarationSyntax namespaceDecl:
            {
                var nsFullName = namespaceDecl.Name.ToString();
                var qualifiedName = Qualify(parentQualifiedName, nsFullName);
                AddSymbol(nsFullName.Split('.')[^1], "namespace", relativePath, qualifiedName, parentQualifiedName, namespaceDecl, tree, symbols);
                VisitMembers(namespaceDecl.Members, relativePath, tree, qualifiedName, symbols);
                break;
            }
            case FileScopedNamespaceDeclarationSyntax fileScopedNamespace:
            {
                var qualifiedName = Qualify(parentQualifiedName, fileScopedNamespace.Name.ToString());
                AddSymbol(fileScopedNamespace.Name.ToString().Split('.')[^1], "namespace", relativePath, qualifiedName, parentQualifiedName, fileScopedNamespace, tree, symbols);
                VisitMembers(fileScopedNamespace.Members, relativePath, tree, qualifiedName, symbols);
                break;
            }
            case ClassDeclarationSyntax classDecl:
                VisitTypeDeclaration(classDecl.Identifier.Text, "class", classDecl, classDecl.BaseList, classDecl.Members, relativePath, tree, parentQualifiedName, symbols);
                break;
            case RecordDeclarationSyntax recordDecl:
                VisitTypeDeclaration(recordDecl.Identifier.Text, "class", recordDecl, recordDecl.BaseList, recordDecl.Members, relativePath, tree, parentQualifiedName, symbols);
                break;
            case InterfaceDeclarationSyntax interfaceDecl:
                VisitTypeDeclaration(interfaceDecl.Identifier.Text, "interface", interfaceDecl, interfaceDecl.BaseList, interfaceDecl.Members, relativePath, tree, parentQualifiedName, symbols);
                break;
            case EnumDeclarationSyntax enumDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, enumDecl.Identifier.Text);
                AddSymbol(enumDecl.Identifier.Text, "enum", relativePath, qualifiedName, parentQualifiedName, enumDecl, tree, symbols);
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
                    symbols,
                    methodDecl.ParameterList.ToString());
                break;
            }
            case PropertyDeclarationSyntax propertyDecl:
            {
                var qualifiedName = Qualify(parentQualifiedName, propertyDecl.Identifier.Text);
                AddSymbol(propertyDecl.Identifier.Text, "property", relativePath, qualifiedName, parentQualifiedName, propertyDecl, tree, symbols);
                break;
            }
            case FieldDeclarationSyntax fieldDecl:
            {
                foreach (var variable in fieldDecl.Declaration.Variables)
                {
                    var qualifiedName = Qualify(parentQualifiedName, variable.Identifier.Text);
                    AddSymbol(variable.Identifier.Text, "field", relativePath, qualifiedName, parentQualifiedName, variable, tree, symbols);
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
                    symbols,
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
        SyntaxNode declaration,
        BaseListSyntax? baseList,
        SyntaxList<MemberDeclarationSyntax> members,
        string relativePath,
        SyntaxTree tree,
        string? parentQualifiedName,
        List<Symbol> symbols)
    {
        var qualifiedName = Qualify(parentQualifiedName, name);
        var typeRefs = BuildBaseRefs(baseList);
        AddSymbol(name, kind, relativePath, qualifiedName, parentQualifiedName, declaration, tree, symbols, refs: typeRefs);
        VisitMembers(members, relativePath, tree, qualifiedName, symbols);
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

    private static void AddSymbol(
        string name,
        string kind,
        string relativePath,
        string qualifiedName,
        string? parentQualifiedName,
        SyntaxNode node,
        SyntaxTree tree,
        List<Symbol> symbols,
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
