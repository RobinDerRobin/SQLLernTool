# Game-Designer: Validierung der Arbeitspakete

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

# Validation of Robin's work-package list

## 1. Coverage

**Missing, or hidden inside another package:**
- **Combat core**: shooting, the power bar, energy vs. one-hit deaths, options, firing direction after a 180° flip. v0.2 has a working Gradius-style bar, 3 pilots and instant death on terrain, which is fine as a placeholder. The open question is whether this still reads in a top-down, rotating window. Nothing in the list asks it, except partly P4.
- **Death and restart**: checkpoints, respawn point, power-up loss. This is hidden in 3 ("save position"). It needs its own package because it sets how harsh "wrong direction can kill" feels.
- **Setting, tone and look**: art rules for a floor plan seen from above, and audio direction. Today this sits inside 8, but it must be separate. v0.2 is drawn from the side, so the plan view changes all of the art. Open rules:
  - whether sprites rotate with the world or stay upright on screen;
  - whether the art reads at 8 rotations.
- **Enemies and bosses**: missing. v0.2 has 5 bosses and about 20 enemy types as placeholders. Needs the setting and the combat core first.
- **Progression over the whole game**: ability order, the graph of which keys open which locks, the solver. This is hidden in 2 and 8. It needs its own paper-plus-solver step before world building.
- **Overall controls**: the button budget is hidden in 2 and already conflicts:
  - v0.2: RB = turbo.
  - P1: LB/RB = rotate.
  - P3: LT/RT = 45°.

  This belongs in the cross-cutting work, with a decision after the turning packages.
- **Covered:** camera and scrolling (package 1 and Tempo). Onboarding and show-don't-tell can stay with world building.

**Good enough in v0.2, no package needed:** audio synthesis and sound effects (until the setting is decided), the power-bar mechanics, saving, the deterministic 60 Hz simulation, perf/flash/E2E tests, Deck packaging.

**New risk:** rendering speed at 45° and during swings, because patterns are pre-rendered. This goes in the cross-cutting work [geschätzt].

## 2. Each package

- **1 Directions & screen:** one concept (the window). Two changes:
  - Widen P4 to "Does combat work in the window, in both scroll directions and around a swing?"
  - P2 should only answer "is a minimap needed?"; the full map design stays in 7.
  - Also add "arena rotates with the window (octagon) or stays north-up" to P1/P3.
- **2 Turning:** two concepts. Split into:
  - **Turn places and stages**: which turns are free, which are earned, and where.
  - **Turn charge**: does a charge create decisions or only friction?

  Controls move to the cross-cutting work.
- **3 Forks:** three concepts. Keep only forks: "How does a fork mid-stage work: a halt room, or pre-selecting on the approach?" "Wrong direction can kill" moves to 5. "Save position" moves to Death and restart.
- **4 Tempo:** one concept. It's Robin's biggest v0.2 complaint and almost independent of the rest.
  - The anchor is the Flexileine, so it moves to 6.
  - "Encounters as data" is tooling that every prototype needs, so it moves to the cross-cutting work.
- **5 Direction as world factor:** one concept. It absorbs "wrong direction can kill".
- **6 Abilities with three uses:** fine. Design the mechanics independent of setting; names come later.
- **7 Map and orientation:** fine without the Rohrpost, which is a world-structure feature and moves to Progression/world.
- **8 World building:** split into Setting, Enemies and bosses, Progression, and World building. World building last is right; the setting being last is not.

## 3. Dependencies and order

- **Critical path:** Window → Turn places → Forks → World factor → Progression → World building.
- **Parallel once P1/P4 confirm the top-down view:** combat core, Tempo, and Setting (paper only).
- **The setting must be decided** before enemies and bosses, before ability identity, before the final landmarks for orientation, and before world building. Latest point: the end of World factor. The look under rotation should be tested early, with placeholder landmarks in P2.
- **Death and restart** comes after Forks, because forks are natural checkpoints.
- **Map and orientation** comes after Forks and World factor.
- **Solver sync** starts with the first rules, in Turn places.

## 4. Decisions Robin needs to make

| Package | Decisions |
|---|---|
| Window | Rotation buttons; whether the swing freezes play and how long it lasts; minimap yes/no; arena rotates or stays north-up; sprites rotate or stay upright on screen; **new E8: is the 180° flip free, or gated by the Wendehals?** |
| Combat | Keep the power bar? Energy or one-hit? Fire only forward? |
| Turning | E2 (charge cost model); E3 must be asked again, because LB/RB replaces "B + stick"; E4 (Kreisel push-back is now a flip); E5 only matters if E8 = gated; how many turn stages |
| Forks | Halt room or pre-selection; are closed forks visible as teasers? |
| Death and restart | Where you respawn; what you lose (Sparstrumpf) |
| Tempo | Tempo range; cruise yes/no |
| World factor | Which factors; a warning before a stage that kills when flown backwards? |
| Map | Minimap always on; Rohrpost |
| Setting | World, tone, art rules; are the dachshund and the title kept? E7 is void and E1 is obsolete |
| World building | E6 (scope) |

## 5. Corrected package list

| # | Package | Core question | First prototype | Depends on |
|---|---|---|---|---|
| 1 | Window | Can players read and steer a top-down world through a rotating horizontal window? | P1 Kreuzung (approved), then P2–P4 | – |
| 2 | Combat in the window | Does Parodius-style shooting read in the top-down view, in both scroll directions? | Straight corridor with v0.2 enemies and power bar; Y flips mid-wave | P1 |
| 3 | Tempo and rhythm | Which pace changes make a stage dynamic? | One corridor with fight → halt → suction → cruise keyframes vs. the v0.2 generator | 2 |
| 4 | Turn places and stages | Which turns are free, which are earned, and where? | Arena with ring, Kreisel and Kompassrose; abilities switchable | 1 |
| 5 | Turn charge | Does a charge create decisions or friction? | P1 map with a 4-segment charge vs. none | 4 |
| 6 | Forks | How does a mid-stage fork work? | One fork: halt room vs. pre-selection on the approach | 4 |
| 7 | Direction as world factor | Which heading-dependent facts create puzzles and danger? | Loop with a one-way flap, a current, a back switch, a stage that kills when flown backwards | 6, E8 |
| 8 | Death and restart | Where do you restart, and what do you lose? | 3 respawn variants on the fork stage | 6 |
| 9 | Abilities with three uses | Can one ability serve combat, movement and puzzles? | The leash: anchor, lasso, pull switch | 2, 3, 7 |
| 10 | Map and orientation | Which map UI do players need? | Full map and markers on the P2 loop | P2, 6, 7 |
| S | Setting, tone and look | Which world, tone and art rules, readable at 8 angles? | 3 one-page pitches, one rotated mock screen each | Parallel now; decide before 9 and 11 |
| 11 | Enemies and bosses | Which enemies and bosses fit the setting and the window? | One boss in a rotated arena | S, 2 |
| 12 | Progression | In which order do keys open locks? | Paper graph plus solver run | 4, 7, 9 |
| 13 | World building | Areas and slices | Slice A | All above |
| Q | Cross-cutting | Controls budget, encounter data format, telemetry, Deck quality (motion comfort, rotated-rendering speed), solver sync | – | Ongoing |

### Critical Files for Implementation
- `/home/user/SQLLernTool/wendehals/docs/WELT-DESIGN.md`
- `/home/user/SQLLernTool/wendehals/docs/PLAN-v0.3.md`
- `/home/user/SQLLernTool/wendehals/docs/DESIGN.md`
- `/home/user/SQLLernTool/wendehals/README.md`: current controls, including RB = turbo
- `/home/user/SQLLernTool/wendehals/src/game/level.js`
