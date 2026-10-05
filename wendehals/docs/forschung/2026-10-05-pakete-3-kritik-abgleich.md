# Kritiker: Abgleich beider Validierungen (zusammengeführte Liste)

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

I reviewed both lists against CLAUDE.md, PLAN-v0.3.md, WELT-DESIGN.md and the v0.2 code. Each list gets about half right. A keeps all the areas visible but double-books some of them. B has the right process but leaves areas out.

**1. Where each list is right and wrong**

**List A (game designer), right:**
- It keeps combat, death & restart, setting, enemies & bosses and the map visible.
- Forks are their own package, which Robin requires ("arenas aren't the only way to take a fork").
- The decision housekeeping is right:
  - E1 is obsolete: both options (tilted picture, staircase terrain) break "the screen stays straight".
  - E7 falls with the house setting.
  - E3 must be asked again.
  - The new E8 (is the flip free?) is needed.

**List A, wrong:**
- Combat appears twice: as the widened P4 inside package 1 and as package 2.
- Turn places (4) and turn charge (5) are two answers to one question, "what limits turning".
- Orientation is split between P2 (in package 1) and package 10.
- The "arena rotate vs north-up" toggle in P1/P3 adds a second variable to a prototype Robin already approved. Snapping north-up is also a window rotation without a turn, which his sketch doesn't have.
- There is no engine-graduation package. "Rotated-rendering speed" in Q is only one piece of it: 8 view sites read `heading`, and there is no drawing for junctions or rotated arenas.
- It misses that E8 replaces E5, and that E6 (8 areas, merge cellar/laundry) also falls with the setting.

**List B (prototyping expert), right:**
- The process: question card → one build session → 5 minutes on the Deck → a keep/kill/iterate/park record.
- Graduation as a rewrite with game-vs-solver tests, which matches the CLAUDE.md rule that rules exist once.
- P2 "loop without a map first".
- The CLAUDE.md warning is right and urgent. Its rule "no design decisions outside PLAN-v0.3/WELT-DESIGN" would block the window concept, and Phase 2 (tilted 45° picture, zoom 0.68) contradicts Robin.

**List B, wrong:**
- Package 2 bundles four concepts. Controls belong to P1, since Robin approved LB/RB there. Wrong turns belong to "direction as world factor".
- It drops enemies & bosses, death & restart and forks. Combat is reduced to "swing under fire".
- The solver spike is mostly answered already. The solver state is already (point, heading 0–7, items, flags), and exits already open only in the heading direction (`arena.js:129`; WELT-DESIGN says the same).
- The real open point is P1's door rule. If "matching scroll direction" means the screen side instead of the map direction, the screen side becomes part of the solver state and the state space doubles. A paper check is enough.

**2. Reconciled list**

| # | Package | Type | Core question | First prototype / deliverable | Depends on | Robin decisions |
|---|---|---|---|---|---|---|
| 1 | Window | proto | Does the rotating window (90°, 45°, flip) read and steer well, also under fire? | P1 Kreuzung → P3 45° → P4 shooting top-down in both directions, plus swing under fire | – | E3 (at P1); P1b only after an "iterate" verdict |
| 2 | Orientation & map | proto | Do you stay oriented? Is a minimap needed? | P2 loop without a map, then with the overlay | P1 | minimap yes/no |
| 3 | Forks | proto | How do you take a fork mid-stage: stop in a room, choose in advance, or fly into the opening? | P5 one corridor with one fork | P1 | fork model |
| 4 | Limiting turns | proto | Turn places, charge, or both? | P6 small loop, stations vs charge | 1, 3 | E2, E4, E8 |
| 5 | Direction as world factor | proto | Can direction block, push or kill fairly? | P7 current + one-way door + deadly wrong way | 4, 6 | which factors |
| 6 | Death & restart | decision | Where do you restart, and facing which way? | paper rule, tested in P7 | – | restart point |
| 7 | Tempo & rhythm | proto | Which mix of fight / halt / anchor / cruise gives rhythm? | P8 one stage with keyframes | P4 | list of tempo zones |
| 8 | Window engine graduation | production | Move the proven rules into the real modules | `view` re-keying (v0.2 golden master unchanged), junction drawing, arena rotation, Deck performance, solver door rule | 1–3 kept | – |
| S | Setting, tone & look | decision | What replaces the house? | 2–3 one-page pitches | – | setting; ask E6/E7 again |
| 9 | Abilities (three uses each) | proto → production | Does each ability work in combat, movement and puzzles? | P9 leash | S, 4, 5 | ability list |
| 10 | Enemies & bosses | production | Do enemies and bosses work through a rotating window? | one boss in the window | S, P4 | roster |
| 11 | Progression | paper + solver | Do order, locks and sequence breaks hold on a floor plan? | paper graph + solver run | 4, 5, 9 | order |
| 12 | World building | production | Areas, rooms, stages | first slice | 8, 11, S | scope |
| Q | Cross-cutting | production | – | controls budget, telemetry, save position, encounter data format, Deck performance, solver sync | ongoing | – |

**3. Next steps**
1. **Now:** make the doc changes below and write the P1 question card, with the door rule defined by map direction. Then build P1, Robin plays it on the Deck, and the result is recorded. In parallel, Robin works on setting pitches and someone does the solver paper check.
2. **After P1 is kept:** build P2 and P3 in parallel sessions; Robin plays both in one Deck sitting.
3. **Then:** P4 and P5 in parallel.
4. **Then:** P6, once Robin has answered E2, E4 and E8. Graduation (8) starts in parallel as soon as packages 1–3 are kept. The setting must be decided before packages 9 and 10.

**4. Process and doc changes before building P1**
- **New `docs/PROTOTYPEN.md`, binding.** It holds:
  - the package table;
  - a question card per prototype (question, scope, kill criterion);
  - a dated record per verdict in Robin's words;
  - a decision register: E1 obsolete, E5 replaced by E8, E6/E7 on hold until the setting, E2–E4 open.
- **`PLAN-v0.3.md`:** add the header "paused after Phase 1 (05.10.2026)". WELT-DESIGN.md and welt.json become "reference, not binding". The world3 tests stay green, since no tests may be deleted.
- **CLAUDE.md:**
  - Point "current task" and the do-not rule at PROTOTYPEN.md.
  - Mark the vertical zoom-out, "diagonals throw until Phase 2" and "welt.json is the source of truth" as paused.
  - Prototype rules: code lives in `src/proto/`, the golden master stays unchanged, and the prototype is deleted at graduation.
- **Deck access:** add a "Prototypes" entry to the title menu. No world or prototype switch exists in the code yet, and passing `--welt=proto` on the Deck is awkward. v0.2 stays the default.
- **Gate per prototype:** `npm test` and e2e stay green and the software tester reviews the diff. The real gate is Robin's 5 minutes on the Deck. P1 must remap RB, which is Espresso in v0.2 (`input.js`).

**5. Questions for Robin**
1. P1 doors: does "matching scroll direction" mean the map direction you fly, or the screen side you scroll toward?
2. E8: is the 180° flip free from the start, or earned (Wendehals)?
3. Do the scope targets (4 h, 8 areas, ~70 arenas) still apply, or are they reopened along with the setting?

### Critical Files for Implementation
- /home/user/SQLLernTool/wendehals/CLAUDE.md
- /home/user/SQLLernTool/wendehals/docs/PLAN-v0.3.md
- /home/user/SQLLernTool/wendehals/docs/WELT-DESIGN.md
- /home/user/SQLLernTool/wendehals/src/core/input.js
- /home/user/SQLLernTool/wendehals/src/game/arena.js
