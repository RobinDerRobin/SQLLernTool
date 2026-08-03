# Python track — not built yet

Placeholder. Nothing here ships today; this file records the decisions that
still have to be made, so whoever builds this track starts from a documented
position rather than a blank page.

## What already exists for you

The architecture is track-based end to end, so a Python track needs **new
files, not changes to existing ones**:

- `src/domain/challenge.types.ts` — `BaseChallenge<TEngine, TResult, TExtra>` is
  already generic. A Python challenge is `BaseChallenge<PythonRuntime, PythonResult, PythonExtra>`.
- `src/runtime/Runtime.ts` — the minimal contract (`reset()`). A `PythonRuntime`
  interface extends it with whatever Python execution actually needs; there is
  deliberately **no** shared "run code → output" shape forced across tracks,
  because SQL result sets and Python stdout/exceptions are genuinely different.
- `src/content/schema.ts` — `baseChallengeSchema` covers the mandatory fields
  from `challenge-anforderungen.md` section 1. Add a `pythonChallengeSchema`
  via `.extend()` for track-specific extras (the SQL track's `pg` note has no
  Python equivalent — do not reuse it).
- `src/content/registry.ts` — register the track here. `challengeRunner.test.ts`
  and `schema.test.ts` iterate the registry, so new content is covered by the
  existing gates automatically.
- `src/editor/languages/LanguagePlugin.ts` — implement `tokenize`, `highlight`,
  `computeEnterInsertion`, `applyAutoClose`, `maybeUppercaseLastWord`.
  `src/editor/textOps.ts` (Tab/Shift+Tab) is already language-agnostic and works
  as-is. `domEditor.ts` takes the plugin as a parameter and needs no changes.
- Progress is keyed `trackId:courseId:num`, so a Python track can never collide
  with SQL progress.

## The open decision: which runtime

**Pyodide** (CPython compiled to WebAssembly) is the natural fit — it keeps the
"no backend, single pasteable HTML file" property the SQL track has, and it can
be CDN-loaded from `index.html` exactly like `sql-wasm.js` is today.

Costs to weigh when this is actually scheduled:

- **Download size**: the Pyodide core is on the order of 10 MB (vs. ~1 MB for
  sql.js), before any package like `numpy`. Startup is seconds, not milliseconds.
- **Lazy loading**: it should almost certainly load only when a Python-track
  challenge is opened, not at app boot — which means `EngineFactory` in
  `src/ui/context.ts` grows a per-track lazy-init path instead of the single
  eager `setMainFromSqlJs` it has now. That is the one piece of existing code
  this track will most likely need to touch.
- **Test-side runtime**: the SQL track runs its `challengeRunner` tests against
  Node's built-in `node:sqlite` rather than the browser WASM build, which keeps
  the suite fast. The Python equivalent is running the real `python3` binary in
  a subprocess — fast, but it introduces a machine dependency the SQL track
  does not have. Decide whether the CI gate requires Python installed, or
  whether the track's content tests run against Pyodide in jsdom (slow) instead.
- **`prepareChallenge` equivalent**: the SQL track replays prerequisite
  challenges' `setup` + `solution` to materialize tables. The Python analogue
  would replay prior definitions into the interpreter namespace. The pattern in
  `src/runtime/sql/prepareChallenge.ts` (resolve chain → dedupe → replay in
  order, fixture-tested) transfers directly; the implementation does not.

## Not decided

Whether a Python track should even use the same "validate against final result"
model. SQL validation inspects database state after the fact; Python challenges
may need to assert on stdout, on a returned value, or on a defined function's
behavior. Settle this **before** authoring content — it shapes every challenge's
`validate`, and `challenge-anforderungen.md` section 8 exists precisely because
getting validation wrong is the most expensive mistake to correct later.
