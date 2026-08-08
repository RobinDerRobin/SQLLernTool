# C# track — architecture decided, integration in progress

**Update:** the question this file originally posed ("is the C# track
allowed to require a backend?") is resolved: **no** — Blazor WebAssembly +
Roslyn, running fully client-side, same as sql.js/Pyodide. See
`docs/csharp-engine-poc.md` for the full feasibility proof (a working
compile-and-run pipeline verified in a real browser, four real WASM-specific
bugs found and fixed, the COOP/COEP hosting decision for GitHub Pages via
`coi-serviceworker`) and its "What's left" section for the current
integration status. `csharpEngine.ts` in this folder is the browser-side
loader (step 3 of that plan) — it wraps the Blazor boot sequence and the
`[JSExport]`-ed `RunCode` entry point (`csharp-engine/CSharpEngine.cs`)
behind the same `Runtime`-style `exec()`/`reset()` shape `pyodideEngine.ts`
uses for Python. Verified end-to-end against the real compiled Blazor+Roslyn
bundle (not just mocks): successful runs, compiler-diagnostic errors
(`CS0029`), and runtime exceptions (`IndexOutOfRangeException`) all surface
correctly through the loader when served with the required COOP/COEP
headers.

Not yet done: wiring a served location for the Blazor assets into the main
app's dev server / GitHub Pages deploy, the `validate()` design for C#
content (see the POC doc's step 4), the content track itself, and a
Node-side test engine for CI. The rest of this file is the original
pre-decision framing, kept for context on *why* Blazor WASM was the right
call rather than a backend sandbox or a hand-written subset interpreter.

## The problem (historical — see update above for the resolution)

Every other part of this app is built on one property: **the whole thing is a
single HTML file with no backend**, because that is the only way the Claude chat
feature works (it relies on being opened inside a claude.ai conversation, which
proxies the Anthropic API call). SQL keeps that property via sql.js (~1 MB WASM).
Python can plausibly keep it via Pyodide (~10 MB WASM, see `../python/README.md`).

C# has no equivalent lightweight in-browser runtime:

- **Blazor WebAssembly / .NET WASM** — works, but ships a substantial .NET
  runtime and has slow cold start. Whether that is acceptable for a learning
  tool where a user opens one small exercise at a time is a real question, not
  a formality.
- **A sandboxed subset interpreter** (hand-written, covering only the C# needed
  for early exercises) — small and fast, but it is a significant project in its
  own right, and every gap between "the subset" and "real C#" becomes a
  confusing bug for a learner who cannot tell the difference.
- **A backend execution sandbox** — technically the most straightforward and
  the safest for arbitrary user code, but it **breaks the single-file, no-backend
  deployment model** the rest of this project is built on. That is not a
  detail; it would mean the C# track cannot ship the same way the SQL track
  does, and the app would need two deployment modes.

## What must be decided first

Not "which library" but: **is the C# track allowed to require a backend?**

- If **no** → the choice is .NET WASM (accept the size/startup cost) or a
  subset interpreter (accept the fidelity cost and the build effort).
- If **yes** → the architecture question widens well beyond this folder: user
  code execution needs real sandboxing (untrusted code, resource limits,
  timeouts), and the app gains a server dependency it currently does not have.
  Note that this would *also* be the moment to reconsider whether the chat
  feature still needs the claude.ai-only fetch trick, since a backend could
  hold an API key instead.

Decide that question deliberately, with the size/startup numbers measured, not
guessed. Everything else about adding a track is already mechanical — see
`../python/README.md` for the list of seams (they are identical here) and
`src/content/registry.ts` for where a track gets plugged in.

## What does *not* need deciding

The track/course/challenge structure, progress keying, editor plugin interface,
content schema, and automated content-validation gate all already generalize.
No C# work requires changing them.
