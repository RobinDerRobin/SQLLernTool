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
let you set custom response headers directly. **Note there is in fact no
`<meta>`-tag equivalent for `Cross-Origin-Embedder-Policy`** — unlike CSP,
COEP is HTTP-header-only per spec, so that workaround (mentioned as an
open option in an earlier draft of this doc) does not actually exist and
should be discarded.

### Decision: use the `coi-serviceworker` technique (resolved 2026-08-08)

Researched the actual prior art for "SharedArrayBuffer on GitHub Pages"
(a well-trodden problem for WASM projects — Wasmer, Godot web exports,
several HuggingFace Spaces, etc. all hit it). The established solution is
[`coi-serviceworker`](https://github.com/gzuidhof/coi-serviceworker): a
small service-worker script that intercepts the page's own navigation
request and re-serves it with `Cross-Origin-Opener-Policy: same-origin`
and `Cross-Origin-Embedder-Policy: require-corp` injected, since a service
worker *can* set response headers on requests it intercepts even when the
origin server (GitHub Pages) can't be configured to. This is exactly the
same mechanism `docs.wasmer.io` documents for its own GH-Pages-hosted WASM
SDK, and is what most GH-Pages-hosted threaded-WASM demos in the wild
actually use (see also `tomayac`'s 2025 write-up on the same pattern).

**Chosen over the alternatives** because it requires no change to this
project's hosting (stays on GitHub Pages, no new host/DNS/cert to manage)
and no change to `deploy-pages.yml`'s deployment target — only static
files added to the built output. Moving the C# assets to a
header-capable host (Cloudflare Pages/Netlify) was the fallback if this
didn't pan out; it doesn't need to be pursued now.

**Known trade-offs to carry into implementation (step 3 below):**
- The service worker reloads the page once on first visit to activate
  itself (standard SW-registration-then-reload pattern) — acceptable for
  a learning tool, but means the C# engine's own loading UI needs to
  tolerate one extra reload before it starts fetching Blazor assets.
  **Correction (2026-08-10, see the dated update after step 5 below for
  the full empirical writeup):** the "scope it to only the C# route,
  avoid registering site-wide" idea in the original version of this
  bullet turned out to rest on a wrong assumption — this app has no
  per-route pages to scope to (single `index.html`, no client routing),
  *and* a live test proved a scoped/child-only COOP+COEP doesn't grant
  isolation anyway (isolation is a top-level-document property). The
  header injection has to apply to the whole app. That's fine: the actual
  fix is using `COEP: credentialless` instead of `require-corp`
  site-wide, which does **not** require SQL/Python's CDN loads to send
  `Cross-Origin-Resource-Policy` — verified live, see below.
- COEP `require-corp` only requires `Cross-Origin-Resource-Policy` headers
  on genuinely cross-origin subresources; everything the Blazor boot
  sequence fetches (`.wasm`, `.dll`, `blazor.boot.json`, etc.) will be
  same-origin GitHub Pages assets, so no per-file CORP header wrangling
  is expected to be needed there either way. **Superseded:** per the
  finding below, use `credentialless` rather than `require-corp` in the
  first place, which sidesteps this question for every *other* subresource
  on the page (SQL/Python's CDN scripts) too, not just Blazor's own assets.
- A newer header, `Document-Isolation-Policy: isolate-and-credentialless`,
  is emerging (W3C TAG review as of 2026) as a lower-friction alternative
  that doesn't require COEP on the *page itself* — not yet broadly
  supported enough to depend on, but worth re-checking browser support
  before shipping in case it lets the service-worker hack be dropped
  later.

**This question is now resolved for planning purposes.** Step 3 below
(the browser-side loader) should build on this decision rather than
re-litigate it.

## What's left to actually integrate this (not done yet)

Roughly in dependency order:

1. ~~Resolve the COOP/COEP hosting question~~ — **done, see decision
   above: `coi-serviceworker`, scoped to the C# engine's own route.**
2. ~~Scaffold the actual project directory~~ — **done (2026-08-08):
   `csharp-engine/` at the repo root, checked into git (source only —
   `bin/`, `obj/`, and `wwwroot/refs/*.dll` are gitignored, see below).
   Promoted straight from the scratchpad POC with three real fixes along
   the way, verified with a fresh `dotnet build` + a live `dotnet run` +
   Playwright smoke test (not just "it compiles"):**
   - Swapped the `Microsoft.CodeAnalysis.CSharp.Scripting` package for
     plain `Microsoft.CodeAnalysis.CSharp` — the Scripting API was never
     used (abandoned per the bugs section above), only `CSharpCompilation`
     is, so the extra package was dead weight.
   - `CSharpEngine.GetReferencesAsync()` fetched its reference DLLs from a
     hardcoded `http://localhost:8899/` — a throwaway dev-only file server
     that only existed on the machine that built the original POC. Fixed
     to fetch from a same-origin relative path (`wwwroot/refs/`, via a
     `BaseAddress` static field set once from `Program.cs`'s
     `WebAssemblyHostBuilder.HostEnvironment.BaseAddress`), so it works
     under both `dotnet run` and a real static-hosted deployment without
     any separate server or CORS configuration.
   - The reference-assembly `.dll`s themselves are **not** committed as
     binaries. `CSharpEngineBlazor.csproj` has a
     `CopyCSharpEngineRefAssemblies` MSBuild target (`BeforeTargets="Build"`)
     that copies the exact set `CSharpEngine.cs` needs straight out of the
     installed SDK's own `Microsoft.NETCore.App.Ref` targeting pack
     (resolved via the `$(NetCoreTargetingPackRoot)` /
     `$(BundledNETCoreAppPackageVersion)` MSBuild properties, confirmed to
     resolve correctly on this sandbox's apt-installed SDK) — so they can
     never go stale relative to whichever SDK actually builds the project,
     and the repo stays free of ~1MB of binary blobs that a build step can
     regenerate on demand.

   Verified end-to-end: `dotnet build` succeeds cleanly, the ref-copy
   target populates `wwwroot/refs/` with all 11 needed DLLs, and
   `dotnet run` + a real headless-Chromium Playwright check confirms the
   page still boots and `CSharpEngine.RunCode` still compiles and runs
   real C# — `console.log`'d result: `{"stdout":"x = 4\n","result":null,
   "error":null}` for `int x = 2 + 2; Console.WriteLine($"x = {x}");`.
   See `csharp-engine/README.md` for the build/run recipe and the
   rationale for keeping this a separate top-level project rather than
   folding two build toolchains together. **No CI/deploy step wiring yet**
   — this only builds and runs locally so far, deliberately deferred to
   keep this increment bounded; that's a natural next step once the
   browser-side loader (step 3) needs it.
3. ~~`src/runtime/csharp/csharpEngine.ts` — the browser-side loader~~ —
   **done (2026-08-08):** `loadCSharpEngineFromServer(baseUrl)` injects
   the `blazor.webassembly.js` script tag (mirroring
   `loadPyodideFromCdn`'s script-injection pattern, including shared
   in-flight-load and retry-after-failure behavior), calls
   `Blazor.start()`, resolves `Blazor.runtime.getAssemblyExports(...)`,
   and returns the raw `RunCode` entry point; `createCSharpEngine(exports)`
   wraps it into the `CSharpRuntime` shape (`exec`/`reset`,
   `src/runtime/csharp/CSharpRuntime.ts`) the same way `createPyodideEngine`
   does for Python. 9 unit tests with a fake `Blazor` global (no real WASM
   needed for these, same pattern as `pyodideEngine.test.ts`).

   Also verified live against the **real** compiled Blazor+Roslyn bundle,
   not just mocks: `dotnet publish -c Release`, served the output through
   a minimal Python COOP/COEP static server (the exact recipe earlier in
   this doc — required because of `WasmEnableThreads`), esbuild-bundled
   `csharpEngine.ts` into the served directory, and drove a small test
   page through Playwright that calls `loadCSharpEngineFromServer` +
   `engine.exec(...)` for real. Confirmed all three paths return correctly
   through the loader: a successful run (`stdout` with the right output),
   a compiler-diagnostic failure (`CS0029` on a bad implicit conversion),
   and a runtime exception (`IndexOutOfRangeException`, full .NET stack
   trace). One harmless console warning observed (`ManagedError: ... Could
   not find any element matching selector '#app'` — Blazor's own root
   component search; irrelevant here since only the `[JSExport]` static
   method is used, no Razor component is rendered) — noted for awareness,
   not a defect in the loader.

   Serving location for the Blazor assets in the real app (dev server +
   GitHub Pages deploy) is intentionally still undecided — same
   deliberate-deferral reasoning as step 2's "no CI/deploy wiring yet."
   `loadCSharpEngineFromServer` takes `baseUrl` as a parameter rather than
   a hardcoded path specifically so that decision can be made later
   without changing this module.
4. ~~Decide the `validate()` story for C#~~ — **decided (2026-08-09):
   stdout-only.** `CSharpExecResult` is now exactly `{ stdout, error }` —
   the dead `result` field (always `null`, reserved for this decision)
   was removed from both `CSharpRuntime.ts` and the C# driver's JSON
   payload (`csharp-engine/CSharpEngine.cs`), verified live against the
   real compiled bundle afterward (COOP/COEP server + esbuild-bundled
   loader, same technique as step 3) to confirm the payload shape changed
   correctly on both the success and compiler-error paths.

   Reasoning, weighing the three options this section originally posed:
   - **(a) stdout-only** — chosen. `Console.WriteLine` is the natural way
     a beginner produces output in a console app, exactly parallel to
     Python's `print()`. This project's own Python validators already
     lean on `lastResult.stdout.includes(...)` as a secondary check
     alongside `variables` — so stdout-based assertions are an
     already-proven, already-idiomatic pattern in this codebase, not a
     novel one being introduced for C#. It requires **zero** engine
     changes: `RunCode` has captured stdout faithfully since the original
     POC.
   - **(b) `public static` fields, reflected out** — rejected for the
     early curriculum. It's more C#-idiomatic in the abstract, but it
     would force every challenge — including the very first "print
     something" lesson — to declare `public static` fields on a
     well-known class before the curriculum has taught what `static`
     means (`static-members` is a level-6 B10 tag in
     `docs/csharp-concept-hierarchy.md`, not something a lesson-1
     challenge should need). Teaching a syntax the learner hasn't reached
     yet just to satisfy the test harness is exactly the kind of
     tutorial-imposed artificiality this project avoids elsewhere.
   - **(c) hybrid** — not adopted now, but not foreclosed either. If a
     specific later challenge (e.g. something OOP-heavy that genuinely
     needs to inspect object state, not just printed text) turns out to
     need structured-value introspection, that is the point to revisit a
     static-field-reflection escape hatch for *that* content — not
     something to build speculatively ahead of a concrete need.

   Practical consequence for future content: validators will pattern-
   match/parse `stdout` (regex or substring, same as several existing
   Python validators already do) rather than reading typed values out of
   a `variables`-style dict. Slightly more manual to author than Python's
   validators, but a known, already-used shape in this project.
5. ~~New `csharp` content track scaffold~~ — **done (2026-08-09), partially:
   `src/content/tracks/csharp/types.ts`** (`CSharpChallengeExtra` +
   `CSharpChallenge = BaseChallenge<CSharpRuntime, CSharpExecResult,
   CSharpChallengeExtra>` — `BaseChallenge` itself needed no changes, it
   was already generic enough) and **`src/content/tracks/csharp/courses/
   csharpGrundlagen/course.ts`** (empty `challenges: []`, mirroring
   `pythonGrundlagenCourse`'s shape exactly) both exist and typecheck.
   `csharpChallengeSchema` added to `src/content/schema.ts` too, same
   empty-extra shape as Python's, with matching tests in
   `src/content/schema.test.ts`.

   **Deliberately NOT wired into `src/content/registry.ts`'s `TRACKS`
   yet** — that is the part of this step intentionally left undone, and
   why it's "partially" rather than fully done. Registering an empty
   course would make "C#" appear as a real, selectable option in the live
   course picker (`src/ui/views/sidebar/trackCoursePicker.ts` already
   iterates `TRACKS` generically, so it would pick this up immediately,
   no further UI code changes needed) — but selecting it would try to run
   a challenge that doesn't exist, against an engine
   (`ctx.engines`/`AppContext`) that has no C#-track case yet, using an
   editor with no C# `LanguagePlugin` (syntax highlighting/auto-indent)
   yet, loading a Blazor bundle from a `baseUrl` nothing currently serves
   in dev or production. None of those four gaps are this step's job to
   close (they belong to wiring the engine into the live app, a step this
   plan hasn't named yet — needed before step 7's content can actually be
   *played*, as opposed to merely authored and Gate-1/2-verified). Shipping
   a track that's selectable but non-functional would be worse than not
   shipping it yet, so the registry line is the one deliberately-withheld
   piece here — added the moment those four gaps are closed, not before.

   **Update (2026-08-10): one of these four gaps is now closed.** The C#
   `LanguagePlugin` (`src/editor/languages/csharp/`) exists — a
   `tokenizer.ts`/`highlight.ts`/`autoIndent.ts` trio mirroring the
   SQL/Python plugins' shape exactly, plus a reused `autoClosePairs.ts`
   (bracket/quote closing is language-agnostic) and a no-op
   `uppercaseKeyword.ts` (C# keywords are conventionally lowercase, same
   reasoning Python's plugin already used), combined into
   `csharpLanguagePlugin.ts` implementing the `LanguagePlugin` interface
   with `id: 'csharp'`. 28 unit tests
   (`csharpLanguagePlugin.test.ts`) cover keyword/type/string/comment
   tokenization and auto-indent.

   One real design deviation from the SQL/Python precedent, found by
   writing the tests against real C# syntax rather than assuming the
   ported pattern would just work: SQL's and Python's tokenizers both
   classify *any* word immediately followed by `(` as a function call,
   checked *before* keyword-set membership — correct for SQL, where a
   word like `DATE` can legitimately be either a datatype or a function
   name, so the paren-call heuristic is the only way to disambiguate.
   Porting that same priority order to C# verbatim initially misclassified
   `if (`, `while (`, `catch (` — i.e. virtually all real C# control-flow
   syntax — as function calls, since those keywords are almost always
   immediately followed by `(`. Fixed by flipping the priority for C#
   specifically: keyword/type-set membership is checked *first*, and the
   paren heuristic only applies to words that aren't reserved at all. This
   is actually more correct for C# than the SQL/Python order it was copied
   from — every C# keyword and built-in type is a genuinely reserved word
   that can never be reused as an identifier (unlike SQL's looser
   reserved-word rules), so there is no real ambiguity left to resolve with
   paren-position once reserved words are excluded first.

   Deliberately **not** wired into `domEditor.ts`/`editorTab.ts` yet (no
   language-picker code path routes to it) and the C# track is still not
   in `TRACKS` — this increment closes exactly one of the four gaps listed
   above, not all of them. Remaining gaps before the C# track is playable
   in the live app: `ctx.engines`/`AppContext` wiring for a C#-track case,
   the registry line itself, and deciding where the Blazor bundle is
   served from in dev/production (the COOP/COEP `coi-serviceworker`
   question from step 1 is resolved in principle but not yet implemented
   as an actual dev-server/build step).

   **Update (2026-08-10, second increment): the `ctx.engines`/`AppContext`
   gap is now closed too.** `EngineFactory` (`src/ui/context.ts`) gained
   `getMainCSharp()`/`ensureCSharpEngine(loadEngine)`, mirroring
   `getMainPython()`/`ensurePythonEngine(loadPyodide)` exactly: lazy,
   load-once-and-cache, single shared engine (no separate disposable
   engine, since — like Python — every `exec()` is a fresh, stateless run).
   `ensureCSharpEngine` takes a zero-argument `loadEngine` closure rather
   than a `baseUrl` directly, so the factory itself stays agnostic of
   where the Blazor bundle is served from (that decision is still open) —
   a real call site would pass `() => loadCSharpEngineFromServer(baseUrl)`.
   6 new unit tests in `context.test.ts`, same shape as the existing
   Python engine tests (load-once/caching, exec() delegation, retry after
   a failed load). All 16 test files that build a fake `EngineFactory` for
   other UI tests were updated to satisfy the now-larger interface (a
   rejecting `ensureCSharpEngine` stub, matching how each already stubs
   `ensurePythonEngine`) — pure mechanical follow-through, no behavior
   changes to those tests.

   **Deliberately not done in this increment:** no call site anywhere
   actually calls `ensureCSharpEngine` yet (unlike Python's
   `ensurePythonEngineLoaded` in `src/ui/state/actions.ts`, triggered when
   a Python-track challenge opens) — there is no C#-track challenge that
   could trigger it, since the registry line is still the deliberately-
   withheld piece. Wiring a real call site now would be dead code with
   nothing to invoke it. Two gaps remain: the registry line itself, and
   the Blazor bundle's dev/production serving location — the latter has
   to land before a real call site can pass it a working `baseUrl`.

   **Design revision needed (2026-08-10, analysis only, no code changed):**
   re-examining the still-open serving-location gap surfaced a real problem
   with the hosting plan as currently written. The COOP/COEP decision
   above (`coi-serviceworker`, "scoped to the C# engine's own route") was
   written assuming there'd be a literal separate route/page for the C#
   engine. There isn't one, and can't easily be one: this app is a single-
   page app with **no client-side routing at all** — `vite.config.ts` uses
   `vite-plugin-singlefile` to inline the entire SQL/Python/(future C#) UI
   into one `index.html`, and `loadCSharpEngineFromServer` in
   `src/runtime/csharp/csharpEngine.ts` (confirmed by re-reading the
   current code, not just the plan) injects Blazor's `<script>` tag
   directly into `document.body` of that *same* document. COOP/COEP are
   enforced per-document, decided by that document's own response headers
   — there is no way to apply them to "only the C# part" of a single HTML
   document. Applying them to the whole document to satisfy multithreaded
   WASM's `SharedArrayBuffer` requirement would put every other track's
   asset loads under `Cross-Origin-Embedder-Policy: require-corp` too —
   including SQL/Python's CDN-hosted `sql.js`/Pyodide `<script>` loads in
   production, and this project's own `context.route()`-served local
   copies in every Playwright bug-hunt pass — neither of which currently
   sends a `Cross-Origin-Resource-Policy` header, and both would silently
   start failing to load. This is exactly the kind of regression risk the
   "never leave the repo in a broken intermediate state" rule in the
   standing routine mandate exists to prevent, so it's flagged here rather
   than implemented under time pressure.

   **Update (2026-08-10, later same day): the iframe proposal above is
   WRONG — empirically disproven, not just reconsidered.** Built a
   minimal, throwaway Node+Playwright harness (two local HTTP origins on
   different ports, standing in for a same-origin parent app and a
   cross-origin CDN, since the sandbox blocks real CDN domains) and tested
   the actual claim before writing any real code:
   - **Same-origin child iframe with its own `COOP: same-origin` +
     `COEP: require-corp`, embedded in a parent with NEITHER header:**
     `window.crossOriginIsolated` inside the iframe measured **`false`**,
     `SharedArrayBuffer` **undefined**. A positive control (both parent
     *and* child sending the headers) measured `true`/available in both,
     proving the harness itself was sound — the negative result is real.
     Cross-origin isolation is a property of the top-level browsing
     context / agent cluster, decided by the *top* document's own headers;
     a child frame cannot unilaterally opt itself into it while the parent
     stays unisolated. The whole "isolate only the iframe, leave
     `index.html` alone" premise from the proposal above does not work,
     full stop — it would need to be abandoned regardless of any
     `postMessage`/transport rewrite effort spent on it.
   - **The actual fix, verified working:** use
     `Cross-Origin-Embedder-Policy: credentialless` instead of
     `require-corp` on the **main document** (`COOP: same-origin` stays
     the same either way). Unlike `require-corp`, `credentialless` does
     **not** require a `Cross-Origin-Resource-Policy` header on cross-origin
     no-cors subresources — it just strips credentials (cookies/HTTP
     auth) from those specific requests, which is irrelevant for public,
     unauthenticated CDN scripts. Verified live: a page served with
     `COOP: same-origin` + `COEP: credentialless`, loading a
     cross-origin `<script>` from a second local origin that sends **no**
     `Cross-Origin-Resource-Policy` header at all (deliberately mimicking
     an unconfigured real-world CDN), measured
     `crossOriginIsolated=true`, `SharedArrayBuffer` available, the
     cross-origin script loaded and ran successfully, and zero console
     errors. This directly resolves the regression risk found earlier
     today — SQL/Python's CDN-hosted `sql.js`/Pyodide loads and this
     project's `context.route()`-served local copies in every Playwright
     bug-hunt pass need no changes at all, because they're all plain,
     unauthenticated, public-script loads with nothing that
     `credentialless` would strip. (The one network call in this app that
     *is* cross-origin, `claudeChatClient.ts`'s `fetch()` to
     `api.anthropic.com`, sends no `credentials` option and carries no
     cookies — also unaffected, confirmed by re-reading that file.)
   - **This also simplifies the plan back down**, not up: the original
     2026-08-08 decision ("`coi-serviceworker`, applied to the whole app")
     turns out to have been *closer to correct* than this same day's
     earlier iframe detour — the only real correction needed to that
     original plan is **use `credentialless` mode, not `require-corp`**,
     applied document-wide via whatever mechanism sets the headers
     (`coi-serviceworker`'s injected headers in production/GitHub Pages,
     a small Vite dev-server middleware locally). No iframe, no
     `postMessage` transport rewrite, no change to
     `loadCSharpEngineFromServer`'s current "inject a `<script>` tag into
     the current document" approach.
   - **Update (2026-08-10, later same day): `WasmEnableThreads` under
     `credentialless` now verified against the real published bundle, not
     just a plain HTML page.** First, a real, previously-undiscovered
     build bug surfaced while getting a fresh publish output at all: a
     clean `dotnet publish -c Release` failed with `CS8802` (only one
     compilation unit can have top-level statements) — the SDK's default
     recursive `**/*.cs` glob was sweeping `csharp-engine/driver/Program.cs`
     (the separate console project from step 6 below, added in a later
     session) into this project's own compilation. Fixed with a
     `<Compile Remove="driver/**/*.cs" />` exclusion in
     `CSharpEngineBlazor.csproj` (committed separately, verified against a
     clean publish and the full npm test suite — 990/990, this touches
     nothing under `src/`).

     With a real publish output in hand: served
     `csharp-engine/bin/Release/net8.0/publish/wwwroot` from a minimal
     Node static server sending `COOP: same-origin` +
     `COEP: credentialless` on every response, and loaded it in real
     headless Chromium via Playwright. `window.crossOriginIsolated` was
     `true` immediately. The published `index.html`'s own built-in boot
     script (`Blazor.start().then(...)`, already present in the checked-in
     file, unrelated to anything written today) ran
     `CSharpEngine.RunCode('int x = 2 + 2; Console.WriteLine($"x = {x}");')`
     automatically on load and logged
     `CSHARP_RESULT:{"stdout":"x = 4\n","error":null}` to the console — a
     real Roslyn compile and a real WASM execution, both succeeding under
     `credentialless`. A follow-up call against the same already-booted
     instance with intentionally invalid code
     (`int x = "not a number";`) correctly returned a real compiler
     diagnostic, `error CS0029: Cannot implicitly convert type 'string' to
     'int'`. (An earlier attempt to *also* manually re-inject the Blazor
     script and call `Blazor.start()` a second time from the test harness
     — redundant, since the page already does this itself — caused a
     harmless "root component already attached" collision error and an
     apparent multi-minute hang; that was a bug in the throwaway test
     script, not in the engine or in `credentialless` itself, and
     disappeared once the test just let the page's own boot script run
     once.)

     **This closes the hosting question for real.** The plan from
     2026-08-08 (apply the headers document-wide via `coi-serviceworker`
     in production / a small dev-server middleware locally), corrected
     today to use `credentialless` instead of `require-corp`, is now
     verified end-to-end against the actual multithreaded-WASM Blazor
     bundle — not just reasoned about. The next concrete C# increment for
     a future firing is building the actual Vite dev-server middleware
     (so `npm run dev` serves `csharp-engine/`'s published output with
     these headers) and wiring GitHub Pages' `coi-serviceworker` for
     production — no more open design questions block that work.

   **Update (2026-08-10, third increment same day): the dev-server
   middleware is now built.** `vite.config.ts` gained a
   `csharpEngineDevServer()` plugin (`apply: 'serve'`, so production
   builds are completely untouched): sets `Cross-Origin-Opener-Policy:
   same-origin` + `Cross-Origin-Embedder-Policy: credentialless` on every
   dev-server response, and serves
   `csharp-engine/bin/Release/net8.0/publish/wwwroot` (gitignored, built
   locally via `dotnet publish -c Release`) under `/csharp-engine/`. If
   that publish output doesn't exist (a fresh clone without the .NET SDK),
   the plugin logs a one-line note and simply skips the static-file
   middleware — `npm run dev` still works fine for SQL/Python either way.

   Live-verified end-to-end with the real dev server (`npm run dev`,
   Playwright, the usual `context.route()` CDN workaround for
   sql.js/Pyodide): the main app's `window.crossOriginIsolated` is `true`,
   10/10 sampled SQL solutions and 9/9 sampled Python solutions still pass
   with zero console errors — the `credentialless` finding held up against
   the real app, not just the earlier synthetic test. `/csharp-engine/`
   itself also reports `crossOriginIsolated: true`, and its built-in
   smoke-test page (already in the checked-in `index.html`, unrelated to
   today's work) successfully compiled and ran real C#
   (`CSHARP_RESULT:{"stdout":"x = 4\n","error":null}`) through the actual
   Vite middleware.

   **One more real bug found and fixed along the way:** the first attempt
   at `/csharp-engine/` 404'd with `Blazor is not defined`. Cause: the
   checked-in `index.html` hardcodes `<base href="/" />`, written for the
   case where this project is hosted at its own origin root (e.g.
   `dotnet run`'s own dev server). Nested under `/csharp-engine/`, that
   base href resolves the page's relative `_framework/blazor.webassembly.js`
   script tag against site root instead of the mount path — a 404 for the
   script itself, hence `Blazor` staying undefined. Worse, this isn't just
   a page-load nuance: `Program.cs` sets `CSharpEngine.BaseAddress` from
   `WebAssemblyHostBuilder.HostEnvironment.BaseAddress`, which Blazor
   itself derives from the same `<base href>` at boot — so a wrong base
   href would 404 the ref-assembly fetches
   (`CSharpEngine.GetReferencesAsync()`) too, not merely the initial
   script load. Fixed by rewriting `<base href="/" />` to
   `<base href="/csharp-engine/" />` specifically when the middleware
   serves that one HTML file — nothing else about the response changes.
   **Implication flagged for the next wiring increment:** the real
   `loadCSharpEngineFromServer(baseUrl)` path (used once a real call site
   exists) injects its own `<script>` tag with an absolute `src` rather
   than relying on a relative one, sidestepping half of this problem — but
   Blazor's *own* internal boot sequence still resolves its base address
   from `document.baseURI` of whichever document hosts it, which for a
   script injected into the *main SQLLernTool app's own document* would be
   that document's base (effectively `/`, no override), not
   `/csharp-engine/`. Embedding the engine in a dedicated iframe (its own
   document, naturally getting the right `baseURI` from its own URL) would
   solve this for free — and is now safe from an isolation standpoint too,
   since a same-origin iframe *does* inherit `crossOriginIsolated` from an
   already-isolated parent (confirmed by this session's earlier positive-
   control test, 2026-08-10). Revisiting the iframe idea for *this*
   specific reason — not the COOP/COEP reason it was wrongly proposed for
   earlier today — is worth real consideration in the next increment that
   wires an actual `ensureCSharpEngine` call site.

   **Update (2026-08-10, next day's first firing): confirmed empirically
   — an iframe (or equivalent dedicated document) is required, not just
   nicer-to-have.** The open question above was whether Blazor's *own*
   core module loader (`_framework/dotnet.js` etc., not just this
   project's custom ref-assembly `HttpClient`) resolves paths from
   `document.baseURI`/`<base href>`, or from wherever the
   `blazor.webassembly.js` script itself was loaded from — if the latter,
   a small `[JSExport]` setter overriding `CSharpEngine.BaseAddress`
   explicitly from JS might have been enough, without needing an iframe.

   Tested directly with a throwaway static server (scratchpad-only, no
   repo changes): served the published output under `/v2/` while the
   page's own `<base href>` stayed `/` (the same mismatch the main
   SQLLernTool document would have — no `<base>` tag at all, so
   `document.baseURI` defaults to site root), with a correctly-absolute
   `<script src="/v2/_framework/blazor.webassembly.js">` tag (mirroring
   exactly what `loadCSharpEngineFromServer` already does). Result: the
   script itself loaded fine, but Blazor's own bootstrapper then tried to
   fetch `http://.../​_framework/dotnet.js` (base-href-relative, resolving
   against `/`) instead of `http://.../v2/_framework/dotnet.js` (where it
   actually lives) — a 404, and `Failed to start platform. Reason:
   TypeError: Failed to fetch dynamically imported module`. This happens
   inside Blazor's own core loader, before any of this project's C# code
   ever runs — so no JS-side override of `CSharpEngine.BaseAddress` could
   possibly fix it; the fix has to happen before `Blazor.start()`, at the
   level of which document is hosting it.

   **Conclusion, now settled:** injecting Blazor directly into the main
   SQLLernTool document will not work as long as that document has no
   `<base href>` matching `/csharp-engine/` (it currently has none at
   all). The two remaining options are (a) mutate the main document's
   `<base href>` dynamically before booting Blazor — rejected as too
   risky, since it's a global side effect on *every* relative URL
   resolution in the SPA for as long as it's set, including anything
   SQL/Python-related happening concurrently; or (b) host the engine in a
   dedicated iframe pointed at `/csharp-engine/`, whose own `document.baseURI`
   is naturally correct without touching the parent at all, and whose
   isolation is inherited for free from the already-isolated parent. (b)
   is the only sound option. The next C# increment that wires a real
   `ensureCSharpEngine` call site should build this iframe + `postMessage`
   transport as part of that work, not attempt direct injection — the
   uncertainty that justified deferring this decision is now resolved.

   **Update (2026-08-10, next firing): the iframe transport is now built.**
   `src/runtime/csharp/csharpEngine.ts`'s `loadCSharpEngineFromServer` no
   longer injects a `<script>` tag into the current document at all — it
   creates a hidden `<iframe src="${baseUrl}host.html">` and waits for a
   `csharp-host-ready` `postMessage` before resolving. A new file,
   `csharp-engine/wwwroot/host.html`, is the dedicated hosting document:
   boots Blazor itself on load (deliberately no `<base>` tag, so its
   `document.baseURI` naturally matches wherever it was actually served
   from), then listens for `{ type: 'csharp-run', id, code }` messages and
   replies with `{ type: 'csharp-result', id, json }` (or `error`) —
   `RunCode`'s JSON payload passed through unchanged, id-matched so
   concurrent requests can't cross-resolve. `CSharpRuntime`/
   `CSharpExecResult` (the public shape `EngineFactory.ensureCSharpEngine`
   already depends on) did not need to change — only the transport
   underneath did, so last firing's `AppContext` wiring stays intact
   without modification. `createIframeExports`/`loadCSharpEngineFromServer`
   validate every incoming message's `origin` against
   `window.location.origin` and its `source` against the specific iframe's
   `contentWindow`, rejecting anything else — both frames are always
   same-origin by construction, so this is a same-origin sanity check, not
   a cross-origin security boundary.

   `csharpEngine.test.ts` fully rewritten for the new transport (12 tests,
   up from 7): iframe creation/attributes, message round-tripping matched
   by request id, origin/source-mismatch messages ignored, boot-error and
   iframe-load-error rejection with the same friendly German messages as
   before, retry-after-failure creates a fresh iframe, concurrent callers
   share one in-flight iframe, and a resolved engine keeps returning the
   same exports without creating a second iframe. `createCSharpEngine`'s
   own tests (exec/reset) are unchanged since that layer didn't move.

   **Live-verified end-to-end**, not just unit-tested: rebuilt
   `csharp-engine` (`dotnet publish -c Release`, confirming `host.html`
   lands in the publish output), served it through the Vite dev-server
   middleware from two firings ago, and drove the *exact* iframe +
   `postMessage` protocol via Playwright from inside the **real main
   SQLLernTool document** (`http://localhost:5173/`, no `<base>` tag,
   already `crossOriginIsolated`) — the precise scenario that was
   confirmed broken for direct script injection. All three cases
   succeeded: a real compile-and-run (`x = 4`), a real compiler diagnostic
   (`CS0029`) on invalid code, and a real runtime exception with full
   .NET stack trace (`IndexOutOfRangeException` via
   `TargetInvocationException`, matching the original POC's documented
   behavior). SQL still listed all 78 challenges afterward — creating and
   messaging the iframe has no effect on the rest of the app.

   Tests 990 → 993 (+3 net: 12 new iframe-transport tests replacing 7
   script-injection ones). `typecheck`, `npm run build` green (632.59 kB,
   unchanged — this only touches `src/runtime/csharp/` and
   `csharp-engine/wwwroot/`, neither reachable from the production bundle
   any differently than before). `knip`: unchanged, 10 findings. Coverage:
   92.33 % / 73.16 % / 99.14 % / 92.33 %.

   **Deliberately not done in this increment:** still no real
   `ensureCSharpEngine` call site (`src/ui/state/actions.ts` has no
   C#-track equivalent of `ensurePythonEngineLoaded` yet) and the registry
   line is still withheld — this closes the transport-design question
   completely, but wiring the actual UI trigger and making C# selectable
   remains the next increment.

   **Update (2026-08-10, next firing): two more standalone UI pieces
   built, following the same "build it, don't wire the registry yet"
   pattern already used for the `EngineFactory` and `LanguagePlugin`
   increments.** Investigating what a real `runQuery`-equivalent for C#
   would need surfaced a real architectural fact worth recording:
   `src/ui/state/actions.ts`'s `runQuery` is **synchronous** — SQL's
   `executeAndValidate` and Python's `pythonExecuteAndValidate` both run
   to completion without awaiting anything once the engine is loaded — but
   `src/runtime/csharp/executeAndValidate.ts`'s C# equivalent is
   **async** (`engine.exec()` always awaits a real Roslyn compile+run,
   whether via the Node driver or the browser's iframe/postMessage
   transport). Wiring C# into `runQuery` therefore isn't a same-shaped
   drop-in the way Python's `python-loading` `RunOutcome` kind was — it
   needs `runQuery` itself (or a parallel async entry point) to support an
   awaited result, which touches every caller of `runQuery` (currently
   assumes a synchronous return). That's real scope for whichever future
   firing does it, flagged here rather than attempted under time
   pressure this increment.

   What *was* built, safely decoupled from that still-open question: (1)
   `src/ui/views/tabs/editorTab/csharpResultsArea.ts` —
   `renderCSharpRunOutcome`/`renderCSharpLoadingOutcome`, C#'s equivalent
   of `pythonResultsArea.ts`, taking a `CSharpExecuteAndValidateOutcome`
   directly (not routed through `RunOutcome`, since that union hasn't
   been extended yet) and rendering status/stdout — no variables table,
   since step 4's `validate()` decision already established C# locals
   aren't reflectable after `Main` returns. 9 new tests, mirroring
   `pythonResultsArea.test.ts`'s coverage (error/success/warning states,
   empty-stdout empty-state, HTML-escaping). (2)
   `src/ui/views/tabs/editorTab/editorTab.ts`'s `pluginForTrack` and
   `placeholderFor` now handle `'csharp'` (routing to
   `csharpLanguagePlugin`, `//` line-comment placeholders) alongside
   `'sqlite'`/`'python'` — both are unreachable dead branches until the
   registry line lands, exactly like `EngineFactory.ensureCSharpEngine`
   was for two firings before its call site existed.

   Tests 993 → 1002 (+9, all from `csharpResultsArea.test.ts`). `typecheck`
   green. `npm run build` succeeds; size grew 632.59 kB → 635.90 kB (232 →
   239 modules) — `csharpLanguagePlugin.ts` and its dependents (tokenizer,
   highlighter, auto-indent, keyword tables) are now reachable from the
   production entry point via `editorTab.ts`'s import, not just from their
   own test files, so they're bundled for the first time even though
   still unreachable at runtime. `knip`: unchanged, 10 findings. Coverage:
   92.35 % / 73.18 % / 99.15 % / 92.35 %.

   **Update (2026-08-11, next firing): the final gap is closed — C# is
   now live-playable in the app, not just authored and Gate-1/2-verified.**
   The async-`runQuery` question flagged above turned out to have a small
   blast radius: `runQuery` has exactly one call site outside tests
   (`editorTab.ts`'s `run()`), so making it `async function runQuery(...):
   Promise<RunOutcome>` and awaiting it at that one call site was a
   contained change, not the wide refactor the earlier flag worried about.
   `RunOutcome` gained `csharp`/`csharp-loading` kinds (mirroring
   `python`/`python-loading` exactly); `ensureCSharpEngineLoaded` (mirrors
   `ensurePythonEngineLoaded`, same `withTimeout`-wrapped load-once-and-
   cache shape, triggered from `selectChallenge` for `trackId === 'csharp'`)
   passes `loadCSharpEngineFromServer('/csharp-engine/')` — the exact path
   the dev-server middleware from two firings ago already serves. A new
   `session.csharpStatus` field (`withCSharpStatus`) mirrors `pythonStatus`;
   `editorTab.ts`'s `renderPythonEngineStatus` was generalized to
   `renderEngineStatus(status, label)` (Python and C#'s banners are
   otherwise identical) rather than duplicated. `csharpGrundlagenCourse`
   is now registered in `TRACKS` (`src/content/registry.ts`) — the
   deliberately-withheld piece from every prior increment.

   One real bug surfaced and fixed before committing: because SQL/Python's
   branches of `runQuery` now also go through one `await` (even though
   neither does any async work internally), a synchronous DOM click ->
   result render turned into a one-microtask-later render — invisible to a
   human, but four existing `editorTab.test.ts` tests asserted on the DOM
   synchronously right after dispatching the click and started failing.
   Fixed by awaiting one microtask tick in those tests (`await
   Promise.resolve()`), matching a pattern this file already used for the
   Pyodide-load-failure test. Also added a race guard in `run()`: since C#'s
   real compile+run is now the one branch slow enough for a user to
   navigate to a different challenge before it resolves, `run()` re-checks
   the current selection after `await runQuery(...)` and drops the result
   if the user has since moved on, instead of overwriting whatever
   challenge is now open.

   **Live-verified end-to-end against the real dev server** (Playwright,
   not just unit tests): selected the C# track from the sidebar's
   track/course dropdown, confirmed all 27 challenges list, opened
   Challenge 01, confirmed the editor picked up `csharpLanguagePlugin`
   (toolbar shows "C#", syntax highlighting active), ran the actual
   solution — a real Roslyn compile + WASM execution over the iframe
   transport completed, `validate()` ran, the UI showed `✓ Aufgabe
   erfüllt`, three stars, and the correct stdout, and the sidebar's
   challenge-list star badge updated to match. A second run against the
   same challenge completed in ~30ms (engine cached from the first load,
   confirming `ensureCSharpEngine`'s load-once behavior holds under the
   real iframe transport, not just in unit tests). Confirmed no
   regression: SQL still runs and shows success correctly on the same
   page. The one console message observed (`ManagedError: ... Could not
   find any element matching selector '#app'`) is the same harmless
   Blazor-root-component-search noise documented since step 3 above — not
   a new issue.

   Tests 1034 → 1037 (+3: a `csharp-loading` case in `actions.test.ts`, a
   real end-to-end C# success test and a C#-loading-placeholder test in
   `editorTab.test.ts`). `typecheck` green. `npm run build` succeeds; size
   grew 635.90 kB → 827.57 kB gzip 192.41 kB (239 → 269 modules) — this is
   the first build where C# content is actually reachable from the
   production entry point, not just bundled-but-dead code, confirmed by
   grepping the built `dist/index.html` for challenge text (`Kiste`,
   `Lager`, etc. — previously absent, now present). `knip`: unchanged, 10
   findings.

   **Still open, deliberately out of scope for this increment:**
   production hosting. `CSHARP_ENGINE_BASE_URL = '/csharp-engine/'` in
   `actions.ts` only resolves because the Vite dev-server middleware
   (`csharpEngineDevServer()`) serves it locally from a `dotnet publish`
   output that has to be built by hand first — GitHub Pages (or wherever
   this ships) has no equivalent yet. A fresh clone without the .NET SDK,
   or a production build, will show C# as a selectable track whose
   challenges 404 when run. That's the next and last remaining piece:
   `coi-serviceworker` (or an equivalent build step) wiring for whatever
   the real production host is.

   **Update (2026-08-11, next firing): a real architectural constraint
   discovered before writing any coi-serviceworker code — this project has
   *two* distribution paths, not one, and they pull in opposite
   directions here.** `test/build/distOutput.test.ts` (`'is the only file
   emitted (nothing to host alongside it)'`) and `index.html`'s own
   fallback banner ("Deren Inhalt fügst du in einen claude.ai-Chat ein")
   both assert/document that `dist/index.html` must stay a **single,
   self-contained file** — the primary distribution path is pasting that
   one file's content into a claude.ai chat, not (only) hosting it as a
   traditional multi-file website. `coi-serviceworker` fundamentally
   requires a **second** file (its own README: "It must be in a separate
   file, you can't bundle it along with your app") — so the obvious first
   idea, dropping it in Vite's `public/` folder, would make `vite build`
   emit two files and break that test and that distribution path.

   The resolution: `coi-serviceworker.js` (vendored from the official
   `coi-serviceworker` npm package, v0.1.7, MIT, unmodified except for one
   `window.coi = { coepCredentialless: () => true }` config block — forces
   `credentialless` mode regardless of browser, since the library's own
   default (`require-corp` outside Chrome) would break SQL.js'/Pyodide's
   CDN `<script>` loads exactly as originally found in the 2026-08-10
   COOP/COEP investigation above) now lives as a **repo-root file, outside
   `src/` and outside `public/`** — invisible to Vite's build graph
   entirely. `index.html` gained a `<script src="coi-serviceworker.js">`
   tag (plus the `window.coi` config) in its `<head>`; since this is a
   plain external-file reference exactly like the existing sql.js CDN
   `<script>` tag two lines below it, Vite's build passes it through as
   inert markup rather than trying to inline or resolve it — confirmed
   with a real `npm run build` afterward: `dist/` still contains exactly
   one file, `distOutput.test.ts` still passes unmodified. For the
   "paste into a claude.ai chat" use case, that script tag now simply
   404s harmlessly (same as the C# track already does in that context,
   since there's no `/csharp-engine/` to load from there either) — no
   regression, because nothing worked there before either.

   **Empirically verified the technique itself works**, not just that it
   doesn't break the existing tests: built a throwaway plain Node static
   file server (scratchpad-only) that serves the real built
   `dist/index.html` plus the vendored `coi-serviceworker.js` and sends
   **zero** custom headers on every response — deliberately reproducing
   GitHub Pages' exact constraint (no custom header support at all) rather
   than assuming it. Real headless Chromium via Playwright confirmed:
   `window.crossOriginIsolated` → `true`, `navigator.serviceWorker.controller`
   → active, `typeof SharedArrayBuffer` → `"function"` (available) — the
   full isolation stack Blazor's multithreaded WASM needs, achieved with
   zero server-side header support, exactly the GitHub Pages constraint
   this whole detour exists to solve.

   One tooling accident along the way, caught and fixed before it could
   cause confusion in a future firing: installing the `coi-serviceworker`
   npm package (`--no-save`, purely to read its source — the maintained,
   version-pinned copy rather than retyping it from memory) triggered an
   npm dependency-tree reconciliation that silently pruned `playwright`,
   `sql.js`, and `pyodide` from `node_modules` — all three are
   intentionally *not* in `package.json` (they're sandbox-only tooling for
   live Playwright bug-hunts, installed ad hoc per the runbook in
   `docs/ui-ux-audit.md`), so any bare `npm install <pkg> --no-save` can
   prune them as "extraneous." Reinstalled all three afterward; also hit a
   Playwright/browser-cache version mismatch from the reinstall pulling
   the latest `playwright` instead of whatever version the pre-baked
   `/opt/pw-browsers` cache matches — worked around with an explicit
   `executablePath` pointing at the cached `chromium-1194` build rather
   than downloading a new one. **Lesson for future firings:** avoid `npm
   install <pkg>` (even `--no-save`) as a way to just *read* a package's
   source when investigating a library — it has this side effect. Fetching
   the file's contents via `npm view`/registry tooling or a pinned,
   isolated install would avoid disturbing the sandbox's existing
   ad hoc-installed tooling.

   Also added `knip.json` (`{ "ignore": ["coi-serviceworker.js"] }`) —
   knip's static-analysis approach can't see a plain `<script src>`
   reference in `index.html` the way it sees ES module imports, so it
   flagged the new file as dead code; this is a real false positive (the
   file is load-bearing at runtime, just outside knip's traceable graph),
   not a genuine finding, and the project had no `knip.json` before this.

   Tests unchanged (1037/1037 — this increment adds no new source files
   under `src/`, only a vendored static asset and an `index.html` edit).
   `typecheck` green. `npm run build` succeeds, `dist/` still exactly one
   file (828.81 kB, up ~1.2 kB from the `<script>`/`<style>` tag text
   itself — no new bundled code). `knip`: unchanged, 10 findings (the
   `coi-serviceworker.js` false positive now suppressed via `knip.json`).

   **Deliberately not done in this increment:** `.github/workflows/
   deploy-pages.yml` is untouched — it still copies only `dist/index.html`
   to the `gh-pages` branch, so `coi-serviceworker.js` isn't actually
   deployed anywhere yet, and the C# engine's own `dotnet publish` output
   still has no path into that workflow at all (no .NET SDK setup step
   exists there). Both are real, separate next increments: (1) teach
   `deploy-pages.yml` to also copy `coi-serviceworker.js` next to
   `index.html` on `gh-pages`, and (2) add a `dotnet publish -c Release`
   step for `csharp-engine/` plus a copy of its `wwwroot` output into
   `gh-pages` under `/csharp-engine/` (mirroring the dev-server
   middleware's own routing exactly). Deliberately deferred rather than
   done together — modifying the actual production deploy workflow is
   the highest-risk piece of this whole effort (a mistake there is a
   mistake against the real live site, not just this feature branch), and
   deserves its own careful, dedicated increment rather than being
   bundled with today's already-substantial vendoring + verification
   work.

   **Update (2026-08-11, next firing): deferred item (1) is now done —
   `coi-serviceworker.js` is deployed to `gh-pages`.** `deploy-pages.yml`'s
   single publish step now copies `coi-serviceworker.js` to `/tmp` right
   alongside `dist/index.html`, then — after `git checkout -B gh-pages
   origin/gh-pages` — copies both into the working tree and `git add`s
   both before the commit, so they land in the same deploy commit as a
   unit (never `index.html` referencing a script tag that hasn't actually
   been pushed yet, or vice versa). The change is a minimal, mechanical
   extension of the exact pattern the `index.html` copy already used — no
   new logic shape introduced.

   Verified without touching the real `gh-pages` branch or triggering an
   actual deploy (this workflow only runs on push to `main`, and this
   firing works on `claude/github-projekt-b3ivo1`, so editing the YAML
   itself carries zero live-site risk regardless): built a disposable
   scratch git repo simulating the exact same `checkout -B gh-pages
   origin/gh-pages` → copy → `add` → `commit` sequence against a fake
   `main` (with a stand-in `dist/index.html`) and a fake pre-existing
   `gh-pages` (with old `index.html` content only) — confirmed both
   `index.html` and `coi-serviceworker.js` end up correctly staged,
   committed together, and present with their right contents on the
   resulting `gh-pages` tree.

   **Still deliberately not done:** deferred item (2), the C# engine's
   own `dotnet publish -c Release` + `wwwroot` copy into `gh-pages` under
   `/csharp-engine/`. That's a materially bigger CI change (installing
   the .NET SDK + `wasm-tools` workload on the runner, a full WASM
   publish, verifying the published output actually boots under real
   COOP/COEP headers in CI) and stays its own increment. Practical
   consequence of today's step alone: a `main` deploy right now would
   correctly serve a page that achieves `crossOriginIsolated` via the
   service worker, but the C# track would still 404 when it tries to
   fetch its Blazor bundle from `/csharp-engine/`, since nothing publishes
   that path yet — cross-origin isolation being present is a necessary
   precondition for the C# engine to work at all once it *is* hosted, not
   sufficient on its own yet.
6. ~~**Node-side test engine for CI** (`test/helpers/nodeCSharpEngine.ts`,
   mirroring `nodePythonEngine.ts`'s subprocess-based approach) — fully
   feasible now that `dotnet` works in this sandbox; likely just
   `dotnet run` against a temp project, or a small persistent compiler
   host process for speed.~~ **done (2026-08-09):** `dotnet run` against a
   fresh temp project was rejected — it pays for a NuGet restore and full
   build on every single `exec()` call, far too slow for a test suite
   that will eventually run one process per challenge/distractor. Went
   with the "pre-built driver, fast per-call `dotnet exec`" option
   instead: `csharp-engine/driver/` is a small, separately checked-in
   desktop-.NET console project (`CSharpDriver.csproj`, referencing
   `Microsoft.CodeAnalysis.CSharp` directly, **not** part of the Blazor
   WASM project) whose `Program.cs` is a twin of
   `CSharpEngine.cs`'s `RunCode`: same `CSharpCompilation`-based
   parse/emit/`Assembly.Load`/reflection-invoke/stdout-capture pipeline,
   same JSON `{stdout, error}` output shape. The one real difference is
   how reference assemblies are obtained — the WASM engine fetches
   `.dll`s over `HttpClient` from `wwwroot/refs/` because `Assembly.Location`
   doesn't work under Mono/WASM, but on desktop .NET
   `AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")` lists every BCL
   assembly's real file path directly, so the driver just filters that
   list by filename instead (a `ToDictionary` naively deduping that list
   throws — `System.Private.CoreLib` appears twice in it in practice — a
   plain last-wins loop over a `Dictionary` fixed it).
   `test/helpers/nodeCSharpEngine.ts` mirrors `nodePythonEngine.ts`
   exactly (temp dir per `exec()`, user code written to its own file,
   never string-interpolated, subprocess spawned with that dir as `cwd`,
   JSON stdout parsed into `CSharpExecResult`), except it drives the
   driver via `dotnet exec <DriverDll> <path>` — no restore, no rebuild,
   only compiling the *user's* snippet — instead of shelling out to an
   already-installed interpreter the way Python does. The driver `.dll`
   is built lazily on first use (`ensureDriverBuilt()`, a plain
   `dotnet build -c Release` if the `.dll` isn't already there) rather
   than as a separate CI step, so `npm test` alone is still sufficient
   to exercise it. Measured: ~1.0–2.4s per `exec()` after the one-time
   build (vs. an unmeasured but clearly much slower cold `dotnet run`
   path with restore). `test/helpers/nodeCSharpEngine.test.ts` proves
   the success/compiler-error/runtime-exception/fresh-namespace-per-call/
   LINQ round trip against the real `dotnet` toolchain (not mocked) — all
   5 pass. `csharp-engine/driver/{bin,obj}/` added to `.gitignore`
   (mirroring the existing `csharp-engine/{bin,obj}/` entries, which
   didn't cover this new nested project directory).
7. **Actual challenge content**, once 1–6 are settled — start from
   `docs/csharp-concept-hierarchy.md`'s branch overview, same house style
   as the SQL/Python content (3 hints, live-recomputed or state-inspected
   validators, at least one verified-failing distractor per challenge).

This is genuinely several more sessions of real engineering work. Steps
1–4 (hosting decision, project scaffold, browser loader, `validate()`
design) are now done. Step 5 (the `csharp` content track scaffold) is
mostly done — types, schema, and an empty course exist, deliberately not
yet wired into the live `TRACKS` registry (see step 5's own entry above
for exactly which four gaps block that safely). Step 6 (Node-side test
engine) is now done — `test/helpers/nodeCSharpEngine.ts` and its driver
project exist and are verified against the real `dotnet` toolchain. Step
7 (real content) is underway: `describeCSharpCourse` in
`test/content/challengeRunner.test.ts` iterates `csharpGrundlagenCourse.
challenges` generically (added alongside the first challenge, unlike the
hardcoded-per-course setup that predates it), and three challenges exist
as of 2026-08-09 — `01` (Console.WriteLine), `02` (typed variables: int/
double/string/bool), `03` (const, var type inference, char) — covering
B0–B2 completely (see `docs/csharp-concept-hierarchy.md`'s dated updates
for per-challenge detail). Same house style as SQL/Python throughout: 3
hints, at least one verified-failing distractor per challenge — with one
deliberate C#-specific variant, since step 4 decided `validate()` is
stdout-only: distractors that violate a compile-time rule (reassigning a
`const`, passing a `string` where `char` is expected) are verified to
produce a real compiler error rather than a differing stdout, which
`executeAndValidate` already treats as a failing outcome before
`validate()` is ever called. The live app additionally still needs the
four wiring gaps from step 5 closed before any of it is actually playable
in the browser, not just authored and Gate-1/2-verified in Node.
Treat each routine firing that touches this as making **one bounded,
committed increment** (e.g. "scaffold the project directory and get a
minimal Blazor boot working," not "finish the whole engine") — never
leave the repo in a broken intermediate state, and always run
`npm run build:check` before committing.
