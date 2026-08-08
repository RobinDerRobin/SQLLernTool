# C# Execution Engine — Proof-of-Concept Findings

Status as of 2026-08-08: **feasibility proven, not yet integrated into the
repo.** This document exists so the knowledge survives independently of
the session/scratchpad it was built in — the working POC currently lives
only in an ephemeral sandbox scratchpad directory, which does not persist
across sessions/containers. Read this doc first before redoing any of the
exploration below.

## The question

`docs/csharp-concept-hierarchy.md` documents a full C# concept space (86
tags, 17 branches) but the tool has **zero** C# challenges, because unlike
SQL (`sql.js`) and Python (`Pyodide`), there is no lightweight,
npm-installable, prebuilt WASM blob for C#. Building a real engine means
compiling and running actual Roslyn (the C# compiler) inside the browser —
a fundamentally bigger undertaking than dropping in a CDN script.

## What was proven

A real, working pipeline: **Blazor WebAssembly + Roslyn**, using `[JSExport]`
to bridge JS↔C#, mirroring the exact driver-script pattern this project
already uses for `pyodideEngine.ts` and `sqlJsEngine.ts` — take a source
string, compile it, run it, return `{stdout, error}` as JSON.

Verified working end-to-end in a real headless browser (Playwright,
not simulated): variables/arithmetic, `foreach`/`List<T>`, classes with
auto-properties and methods, `try`/`catch` with real .NET exception
messages, LINQ (`Where`/`Select`/`Range`), and correct compiler
diagnostics on bad code (e.g. `CS0029`).

**Bundle size: ~9 MB brotli-compressed** (~55 MB uncompressed, but real
browsers get the compressed transfer) — comparable to Pyodide, a
reasonable one-time load for a learning tool.

## Environment prerequisites (already done in this sandbox, redo if starting fresh)

The .NET SDK is not preinstalled. It installs cleanly via apt in this
sandbox (the apt mirror already carries `dotnet-sdk-8.0` and the
`Microsoft.NETCore.App.Ref` reference-assembly pack — no need to reach
Microsoft's own CDN, which is blocked here):

```bash
sudo apt-get update
sudo apt-get install -y dotnet-sdk-8.0
export DOTNET_CLI_TELEMETRY_OPTOUT=1
dotnet workload install wasm-tools --skip-manifest-update
```

NuGet.org itself **is** reachable from this sandbox (unlike the blocked
CDN domains), so `dotnet restore`/`dotnet publish` work normally once the
SDK + wasm-tools workload are in place.

## Four real WASM-specific bugs found, and their fixes

These are not implementation mistakes to avoid — they're genuine
platform constraints anyone attempting this will hit:

1. **Roslyn's `CSharpScript`/Scripting API cannot run under
   Mono/WASM at all.** It calls `MetadataReference.CreateFromAssemblyInternal`
   on the calling assembly, which needs `Assembly.Location` — a real file
   path — but assemblies loaded under the WASM/Mono runtime have no such
   path. This isn't fixable by passing `ScriptOptions.WithReferences(...)`;
   Roslyn's scripting layer *always* additionally tries to auto-reference
   the "language runtime assembly" via `typeof(object).Assembly`, which hits
   the same failure regardless. **Fix: don't use the Scripting API at all.**
   Use the lower-level `CSharpCompilation.Create(...)` + `.Emit(stream)` +
   `Assembly.Load(bytes)` + reflection-invoke the entry point instead — the
   same pipeline `dotnet run` itself uses, just driven from a source string
   instead of a `.cs` file on disk. This is arguably the *more* correct
   architecture for this tool anyway (handles full programs — classes,
   multiple methods — not just script-style snippets).

2. **`MetadataReference`s must be built from real reference-assembly
   bytes, explicitly.** There's no way to just "use the assemblies already
   loaded" (see #1). Fix: copy a curated subset of
   `.dll` files from `/usr/lib/dotnet/packs/Microsoft.NETCore.App.Ref/<ver>/ref/net8.0/`
   into `wwwroot/refs/`, fetch them via `HttpClient` at runtime, and build
   `MetadataReference.CreateFromImage(bytes)` for each. A curated set
   (`System.Runtime`, `System.Console`, `System.Linq`,
   `System.Linq.Expressions`, `System.Collections`, `System.ObjectModel`,
   `System.Text.RegularExpressions`, `System.Runtime.Extensions`,
   `System.Threading`, `System.Threading.Tasks`, `netstandard`) is only
   ~1.1 MB and covers everything used in this POC's test snippets. Expand
   as real challenge content demands more of the BCL surface.

3. **`CSharpCompilation.Emit(...)` throws
   `PlatformNotSupportedException: Cannot wait on monitors on this
   runtime`.** Roslyn's own CLS-compliance checker (`ClsComplianceChecker`)
   parallelizes internally using blocking `Task.Wait()` calls, which the
   default *single-threaded* WASM runtime cannot support (no real OS
   threads, so no true blocking wait). Fix: opt into **multithreaded WASM**
   (`<WasmEnableThreads>true</WasmEnableThreads>` — an official, supported
   .NET 8 feature, just not the default). This in turn requires the page
   be served with `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: require-corp` headers (needed for
   `SharedArrayBuffer`, which multithreaded WASM depends on) — a real
   production deployment consideration, not just a test-server quirk.

4. **IL trimming silently deletes runtime methods that only the user's
   dynamically-compiled code calls.** Blazor's default publish pipeline
   trims unused API surface based on static analysis of *this app's own*
   code — but since arbitrary user C# is only known at runtime, the
   trimmer has no way to know e.g. `Console.WriteLine(int)` will be
   needed, and removes it. Symptom:
   `MissingMethodException: Method not found: void System.Console.WriteLine(int)`
   even though the code compiled fine. Fix:
   `<PublishTrimmed>false</PublishTrimmed>` — a correctness requirement
   for this specific use case, not an optional size optimization to skip.
   (Also set `<RunAOTCompilation>false</RunAOTCompilation>` — AOT doesn't
   help here since the compiled-at-runtime user assembly can't be AOT'd
   ahead of time anyway.)

Also needed: `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>` (required by
the `[JSExport]` source generator itself, unrelated to user code).

A fifth, mundane pitfall: **incremental `dotnet publish` can leave
`blazor.boot.json`'s SHA-256 integrity hashes stale** relative to the
actual `dotnet.native.wasm` bytes after a config change (e.g. toggling
`WasmEnableThreads`), causing the browser's Subresource Integrity check to
reject the file with "Failed to fetch" / "SRI's integrity checks failed".
Fix: delete `bin/`/`obj/` and do a clean publish after any
`<PropertyGroup>` change.

## The working files (as of this POC)

`CSharpEngineBlazor.csproj` property group:

```xml
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
  <WasmEnableThreads>true</WasmEnableThreads>
  <PublishTrimmed>false</PublishTrimmed>
  <RunAOTCompilation>false</RunAOTCompilation>
</PropertyGroup>
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="8.0.29" />
  <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="8.0.29" PrivateAssets="all" />
  <PackageReference Include="Microsoft.CodeAnalysis.CSharp.Scripting" Version="4.9.2" />
</ItemGroup>
```

(The `Microsoft.CodeAnalysis.CSharp.Scripting` package pulls in
`Microsoft.CodeAnalysis.CSharp` transitively, which is what's actually
used — see finding #1 above for why the Scripting API itself is unused.)

`CSharpEngine.cs` (the `[JSExport]` driver, the C# analogue of
`pyodideEngine.ts`'s `DRIVER_SCRIPT`):

```csharp
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

    private static MetadataReference[]? _cachedRefs;

    private static async Task<MetadataReference[]> GetReferencesAsync()
    {
        if (_cachedRefs is not null) return _cachedRefs;

        using var http = new HttpClient { BaseAddress = new Uri("http://localhost:8899/") }; // fix: relative to actual deploy origin
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
        object? result = null;
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
                error = string.Join("\n", emitResult.Diagnostics
                    .Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => d.ToString()));
            }
            else
            {
                peStream.Seek(0, SeekOrigin.Begin);
                var assembly = Assembly.Load(peStream.ToArray());
                var entryPoint = assembly.EntryPoint!;
                Console.SetOut(sw);
                try
                {
                    var parameters = entryPoint.GetParameters().Length == 0 ? null : new object?[] { Array.Empty<string>() };
                    var invokeResult = entryPoint.Invoke(null, parameters);
                    if (invokeResult is Task task) await task;
                }
                finally { Console.SetOut(originalOut); }
            }
        }
        catch (Exception ex) { error = ex.ToString(); }
        finally { Console.SetOut(originalOut); }

        return JsonSerializer.Serialize(new { stdout = sw.ToString(), result = result?.ToString(), error });
    }
}
```

`index.html` boot snippet (Blazor-specific JS↔C# bridge access pattern):

```html
<script src="_framework/blazor.webassembly.js" autostart="false"></script>
<script>
  Blazor.start().then(async () => {
    const exports = await Blazor.runtime.getAssemblyExports('CSharpEngineBlazor');
    const json = await exports.CSharpEngineBlazor.CSharpEngine.RunCode(userCode);
    // JSON.parse(json) -> { stdout, result, error }
  });
</script>
```

Build/run recipe used for verification:

```bash
export DOTNET_CLI_TELEMETRY_OPTOUT=1
dotnet publish -c Release            # produces bin/Release/net8.0/publish/wwwroot
# serve wwwroot with a static server that sets COOP/COEP headers (see below),
# then drive it with Playwright like any other page in this project's UI checks.
```

A minimal COOP/COEP-aware static server (Python's `http.server` doesn't
send these by default):

```python
import http.server, sys
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()
http.server.test(HandlerClass=Handler, port=int(sys.argv[1]), bind='127.0.0.1')
```

Real end-user deployment (GitHub Pages, per this project's existing
`deploy-pages.yml`) needs the same two headers — GitHub Pages does not
let you set custom response headers directly, so this needs either a
`<meta>`-tag-based COOP/COEP workaround (works in some browsers, not
guaranteed — check current spec support) or serving the C# engine's
static assets from a host that does support custom headers (e.g.
Cloudflare Pages, Netlify, or a `_headers` file if the eventual host
supports it). **This is an open question for the integration path below,
not yet resolved.**

## What's left to actually integrate this (not done yet)

Roughly in dependency order:

1. **Resolve the COOP/COEP hosting question** above — determines where
   the built C# engine assets can actually be served from for real users.
2. **Scaffold the actual project directory** (e.g. `csharp-engine/` at
   the repo root, a real Blazor WASM project checked into git, built via
   a new CI/deploy step) instead of the ephemeral scratchpad copy.
3. **`src/runtime/csharp/csharpEngine.ts`** — the browser-side loader,
   mirroring `pyodideEngine.ts`: dynamically load the Blazor boot
   sequence, expose an `exec(code): CSharpExecResult` function matching
   the `Runtime` interface pattern (`src/runtime/Runtime.ts`).
4. **Decide the `validate()` story for C#.** Python's `variables` capture
   works because Pyodide's driver inspects the script's final namespace
   dict. C# has no equivalent "namespace dict" — a compiled Program's
   local variables aren't reflectable after `Main` returns. Realistic
   options: (a) stdout-only validation for early challenges (print-based,
   like this POC's snippets already are), (b) have challenges assign to
   `public static` fields on a well-known class and reflect those out
   after execution (more C#-idiomatic, closer to SQL/Python's "inspect
   final state" pattern, but constrains how challenges are authored), or
   (c) a hybrid. Needs a decision before content can be written at scale.
5. **New `csharp` content track**: `src/content/tracks/csharp/` (registry
   entry, `types.ts`, a course, following the exact SQL/Python
   scaffolding pattern), plus a `CSharpChallenge` type in
   `src/domain/challenge.types.ts`.
6. **Node-side test engine for CI** (`test/helpers/nodeCSharpEngine.ts`,
   mirroring `nodePythonEngine.ts`'s subprocess-based approach) — fully
   feasible now that `dotnet` works in this sandbox; likely just
   `dotnet run` against a temp project, or a small persistent compiler
   host process for speed.
7. **Actual challenge content**, once 1–6 are settled — start from
   `docs/csharp-concept-hierarchy.md`'s branch overview, same house style
   as the SQL/Python content (3 hints, live-recomputed or state-inspected
   validators, at least one verified-failing distractor per challenge).

This is genuinely several more sessions of real engineering work — steps
1–4 in particular involve architecture decisions worth deliberate
attention rather than being rushed through opportunistically. Treat each
routine firing that touches this as making **one bounded, committed
increment** (e.g. "resolve the hosting question and document the
decision," not "finish the whole engine") — never leave the repo in a
broken intermediate state, and always run `npm run build:check` before
committing.
