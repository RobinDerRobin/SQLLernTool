# C# track — not built yet, and the approach is genuinely undecided

Placeholder. Unlike the Python track, this one has **no obvious answer** — the
point of this file is to say so clearly rather than let someone discover it
mid-implementation.

## The problem

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
