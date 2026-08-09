using System.Reflection;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace CSharpEngineBlazor;

public partial class CSharpEngine
{
    private static readonly string[] RefAssemblyNames =
    {
        "System.Runtime", "System.Console", "System.Linq", "System.Linq.Expressions",
        "System.Collections", "System.ObjectModel", "System.Text.RegularExpressions",
        "System.Runtime.Extensions", "System.Threading", "System.Threading.Tasks", "netstandard",
    };

    /// <summary>
    /// Set once from Program.cs (WebAssemblyHostBuilder.HostEnvironment.BaseAddress) before the
    /// host starts running. Reference DLLs are served as same-origin static assets from
    /// wwwroot/refs/ — no separate CORS-enabled server needed, unlike the throwaway POC this was
    /// promoted from (which pointed at a hardcoded http://localhost:8899/ dev-only file server).
    /// </summary>
    public static string BaseAddress { get; set; } = "/";

    private static MetadataReference[]? _cachedRefs;

    private static async Task<MetadataReference[]> GetReferencesAsync()
    {
        if (_cachedRefs is not null) return _cachedRefs;

        using var http = new HttpClient { BaseAddress = new Uri(BaseAddress) };
        var refs = new List<MetadataReference>();
        foreach (var name in RefAssemblyNames)
        {
            var bytes = await http.GetByteArrayAsync($"refs/{name}.dll");
            refs.Add(MetadataReference.CreateFromImage(bytes));
        }
        _cachedRefs = refs.ToArray();
        return _cachedRefs;
    }

    [JSExport]
    public static async Task<string> RunCode(string userCode)
    {
        var sw = new StringWriter();
        var originalOut = Console.Out;

        string? error = null;
        try
        {
            var refs = await GetReferencesAsync();
            var parseOptions = new CSharpParseOptions(LanguageVersion.Latest);
            var tree = CSharpSyntaxTree.ParseText(userCode, parseOptions);
            var usingsTree = CSharpSyntaxTree.ParseText(
                "global using System;\nglobal using System.Linq;\nglobal using System.Collections.Generic;\nglobal using System.Threading.Tasks;\n",
                parseOptions);
            var compilation = CSharpCompilation.Create(
                "UserSubmission",
                new[] { tree, usingsTree },
                refs,
                new CSharpCompilationOptions(OutputKind.ConsoleApplication, optimizationLevel: OptimizationLevel.Debug));

            using var peStream = new MemoryStream();
            var emitResult = compilation.Emit(peStream);
            if (!emitResult.Success)
            {
                var diagnostics = emitResult.Diagnostics
                    .Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => d.ToString());
                error = string.Join("\n", diagnostics);
            }
            else
            {
                peStream.Seek(0, SeekOrigin.Begin);
                var assembly = Assembly.Load(peStream.ToArray());
                var entryPoint = assembly.EntryPoint!;

                Console.SetOut(sw);
                try
                {
                    var parameters = entryPoint.GetParameters().Length == 0
                        ? null
                        : new object?[] { Array.Empty<string>() };
                    var invokeResult = entryPoint.Invoke(null, parameters);
                    if (invokeResult is Task task)
                    {
                        await task;
                    }
                }
                finally
                {
                    Console.SetOut(originalOut);
                }
            }
        }
        catch (Exception ex)
        {
            error = ex.ToString();
        }
        finally
        {
            Console.SetOut(originalOut);
        }

        var payload = new
        {
            stdout = sw.ToString(),
            error,
        };
        return JsonSerializer.Serialize(payload);
    }
}
