using System.Reflection;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

// Test-only twin of CSharpEngineBlazor.CSharpEngine.RunCode (see ../CSharpEngine.cs), invoked by
// test/helpers/nodeCSharpEngine.ts via `dotnet exec CSharpDriver.dll <path-to-user-code-file>` for
// fast, no-restore per-exec compilation. Reads the user's source from a file path (never from argv
// directly, to sidestep shell-quoting hazards — same reasoning as nodePythonEngine.ts) and prints a
// single JSON line matching CSharpExecResult: {"stdout": string, "error": string | null}.

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: CSharpDriver <path-to-user-code-file>");
    return 1;
}

var userCode = File.ReadAllText(args[0]);

var sw = new StringWriter();
var originalOut = Console.Out;
string? error = null;

try
{
    var refs = GetReferences();
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

var payload = new { stdout = sw.ToString(), error };
Console.WriteLine(JsonSerializer.Serialize(payload));
return 0;

static MetadataReference[] GetReferences()
{
    var trustedPlatformAssemblies = (string)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")!;
    var names = new[]
    {
        "System.Private.CoreLib", "System.Runtime", "System.Console", "System.Linq",
        "System.Linq.Expressions", "System.Collections", "System.ObjectModel",
        "System.Text.RegularExpressions", "System.Runtime.Extensions", "System.Threading",
        "System.Threading.Tasks", "netstandard",
    };
    // Built with a plain loop (last-wins), not ToDictionary — the TPA list can list the same
    // assembly filename more than once (observed in practice for System.Private.CoreLib), which
    // makes ToDictionary throw on the duplicate key.
    var byFileName = new Dictionary<string, string>();
    foreach (var path in trustedPlatformAssemblies.Split(Path.PathSeparator))
    {
        byFileName[Path.GetFileNameWithoutExtension(path)!] = path;
    }

    var refs = new List<MetadataReference>();
    foreach (var name in names)
    {
        if (byFileName.TryGetValue(name, out var path))
        {
            refs.Add(MetadataReference.CreateFromFile(path));
        }
    }
    return refs.ToArray();
}
