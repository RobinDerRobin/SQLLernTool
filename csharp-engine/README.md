# csharp-engine

A Blazor WebAssembly project whose only real job is `CSharpEngine.RunCode`
(`CSharpEngine.cs`) — a `[JSExport]`-ed static method that compiles a string
of C# source with Roslyn (`Microsoft.CodeAnalysis.CSharp`, not the Scripting
API — see below) and runs it in-browser, returning `{ stdout, result, error }`
as JSON.

This is **not yet wired into the main SQLLernTool app** (`../src/`). It is
step 2 of the integration plan in `../docs/csharp-engine-poc.md`, which has
the full background: why the Scripting API doesn't work under WASM, four
other real WASM-specific bugs and their fixes, the COOP/COEP hosting
decision for GitHub Pages, and the remaining steps (browser-side loader in
`src/runtime/csharp/`, the `validate()` design question, a Node-side test
engine, actual challenge content). Read that doc first.

## Prerequisites

```bash
sudo apt-get install -y dotnet-sdk-8.0
dotnet workload install wasm-tools --skip-manifest-update
```

## Build / run

```bash
cd csharp-engine
dotnet build   # or: dotnet run
```

Reference assemblies (`wwwroot/refs/*.dll`) are **not** checked into git —
`CSharpEngineBlazor.csproj`'s `CopyCSharpEngineRefAssemblies` MSBuild target
copies the exact set `CSharpEngine.cs` needs straight out of the installed
SDK's `Microsoft.NETCore.App.Ref` targeting pack on every build, so they can
never go stale relative to whatever SDK is actually compiling this project.
If that target errors saying the targeting pack can't be found, the SDK
install is missing it — see Prerequisites above.

`dotnet run` boots a page that runs one hardcoded smoke-test snippet on load
and logs the result to the browser console as `CSHARP_RESULT:...` — that's a
manual verification aid for this stage, not the real app's UI (there isn't
one yet; this project has no purpose beyond hosting the engine).

## Why a separate .csproj instead of inside `src/`

This is a completely different build toolchain (.NET/MSBuild vs. Vite/npm)
producing a completely different artifact (a ~9MB compressed Blazor WASM
bundle) that the main app will eventually fetch and load dynamically, the
same way it already dynamically loads Pyodide from a CDN. Keeping it as its
own top-level project — rather than trying to fold two build systems
together — mirrors how `sql.js`/`pyodide` are external, independently-built
dependencies from the main app's point of view, not part of the `src/` tree.
