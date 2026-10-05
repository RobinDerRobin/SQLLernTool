# Prototyping-Experte: Validierung der Arbeitspakete

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

## Validating the work packages, from a prototyping point of view

**1. Prototype or production?**

Only uncertain mechanics need prototypes. Standard genre locks (one-way flaps, back switches) and anything content, UI or tooling are production work and should be labelled that way.

- **Prototypable:** package 1, package 2 (stations, charge, controls), the "wrong direction" part of package 3, tempo zones in package 4, compass locks and map-fixed currents in package 5, the minimap in package 7.
- **Production:**
  - the turn stages Drehwurm…Wirbelwind (progression design that the solver checks);
  - the save position;
  - encounters as data;
  - the "three uses" catalogue in package 6;
  - the full map, markers and Rohrpost;
  - package 8;
  - the cross-cutting work.
- **Missing package:** moving Fenster into the engine. Today `Level` knows only the heading. Fenster needs θ and s, a camera in map coordinates and a solver that understands a floor plan. This is the biggest technical risk, because CLAUDE.md requires the game and the solver to share the same rules.

**2. Size**

- **Merge 2 and 3** into one package, "Limiting turns". Where you may turn and what a wrong turn costs is one question space.
- **Move P2** (Orientation) from package 1 into package 7.
- **Dissolve package 6.**
  - The mechanics move into other packages as single steps: the anchor into 4, the Föhn against currents into 5.
  - The ability catalogue becomes production work once the setting is decided. Until then, names are placeholders.
- **Package 5 is large but fine:** it's one step per new mechanic. Prototype only the Fenster-specific ones.

**3. Order and graduation**

- **The riskiest assumption is P1:** if turning the window doesn't feel right, packages 2–8 change.
- **After P1, in parallel:**
  - P3 (45°) and P2 (Orientation). Robin can play both in one session, as separate menu entries.
  - A solver spike that needs no Robin: can the solver express a floor plan with doors that open by heading?
- **Then, in parallel:** limiting turns, and P4 together with Tempo.
- **After that:** package 5, which needs the orientation answer.
- **Then:** the engine graduation, and only after it, production.

**Graduation:** prototype code is never promoted as-is. The steps are:
1. Robin records "keep".
2. The builder rewrites the mechanic in the real modules: rules in `worldgraph`, a game-vs-solver test, tuning values as single constants, golden master + e2e/perf + tester agents.
3. The prototype is deleted.

Robin decides on the design; the coordinator confirms the technical side (solver spike green).

**4. Process per prototype**

1. **Question card (3 lines):** the question, how Robin will know, and what's left out. Robin confirms in one message.
2. **Build within a timebox** of one session. Safety net: `npm test` (golden master unchanged), `npm run e2e`, a menu entry under Options.
3. **Play:** 5 minutes on the Deck, answered in 3 lines.
4. **Decision record:** date, question, Robin's answer in his words, the verdict (keep, kill, iterate or park), tuning values, next step.

Records go in one file, `docs/PROTOTYPEN.md` (the ladders plus the decision log), with IDs F1, F2… When a decision graduates, it's copied into the design docs.

This needs a decision now. `CLAUDE.md` still names `PLAN-v0.3.md` phases 0–11 as the current task, and only allows design decisions that are in `PLAN-v0.3.md` or `WELT-DESIGN.md`. `PLAN-v0.3.md` should be marked as paused after Phase 1, and `PROTOTYPEN.md` added as a binding source. Otherwise the agents will work against the new package list.

**5. Corrected list**

| # | Package | Type | First prototype question | Depends on |
|---|---|---|---|---|
| 1 | Fenster (screen as a window) | Prototype | P1: can I take the fork I want by turning the window, first time, also when flying left or upside down? (then P1b, P3 45°, P4 swing under fire) | – |
| 2 | Limiting turns (stations, charge, controls E2–E4, wrong turns) | Prototype | Is turning only at junction stations enough, or do I miss turning anywhere? | 1 (P1, P3) |
| 3 | Orientation & map | Prototype → production | P2: do I keep my bearings in a loop with landmarks, without any map? | 1 (P1) |
| 4 | Tempo & rhythm (incl. anchor) | Prototype | Do speed changes between corridors (fight, halt, fast) create rhythm, or feel like stalls? | 1 (P4) |
| 5 | Direction as a world factor | Prototype + production | After the window has turned, do I read a map-fixed current correctly? | 1, 3 |
| 6 | Fenster engine (graduation) | Production, with a technical spike first | Spike: can the solver express a floor plan with doors that open by heading? | 1 (P1, P3) |
| 7 | Abilities & progression (turn stages, three uses) | Production (design + solver) | – (mechanics are tested inside 2, 4, 5) | 2, 4, 5, setting |
| 8 | Building the world (areas, bosses, slices) | Production | – | all |
| – | Setting | Robin's decision (not a prototype) | – | can happen any time; needed before 7 |
| – | Cross-cutting (Deck quality, solver in sync, save position, encounters-as-data tooling, telemetry for playtesting slices later) | Production | – | ongoing |

### Critical Files for Implementation
- /home/user/SQLLernTool/wendehals/CLAUDE.md
- /home/user/SQLLernTool/wendehals/docs/PLAN-v0.3.md
- /home/user/SQLLernTool/wendehals/docs/WELT-DESIGN.md
- /home/user/SQLLernTool/wendehals/src/game/worldgraph3.js
- /home/user/SQLLernTool/wendehals/src/game/level.js
