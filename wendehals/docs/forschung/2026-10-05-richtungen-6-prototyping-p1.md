# Prototyping-Experte: Zuschnitt auf P1 „Kreuzung“

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

## Fenster prototype 1: what it should answer, the cut, the build and what comes next

**1. The one question**

*"Can I take the fork I want by turning the window, pressing the right button first time and without thinking? That includes flying left after a 180° turn and flying with the plan upside down."*

This is the risky part. In your model, turning the window and the heading always move together, so "rotate left" always means the dachshund turns left. When you fly right, that's the door at the top of the screen. When you fly left, it's the door at the bottom. That second case is where thinking from the dog's point of view and thinking about the screen can disagree. Everything later (finding your way around a world, the minimap) depends on this turn feeling natural.

**How you'll know after 2–5 minutes:** the screen shows the colour of the bone to fetch. Each arm has a door in its own colour. If you press the wrong turn, the wrong door opens and the plan swings away, so you notice it yourself.
- **Yes:** after about 2 minutes you fetch bones without stopping to think at the junction.
- **No:** you still hesitate or open wrong doors, and you can say when it happens (flying left? upside down?).

Afterwards, reply with 3 lines:
- When did you press the wrong turn?
- Did the paused swing feel like steering or like an interruption?
- Did "left = the dog turns left" match how you think about it?

**2. The cut**

IN:
- **Map:** a single crossroads with 4 dead-end arms of about 8 s each (red, blue, green, yellow). It's a plan with north at the top, stored in map coordinates.
  - Dead ends force a 180° turn, so flying left and flying upside down happen on their own.
  - Every pass through the junction is a 3-way choice (left, right, straight). That gives about 15–20 fork decisions in 4 minutes.
  - A straight corridor with one branch gives one decision per pass, and mostly the easy case (flying right, plan upright).
- **Fetch loop:** the bone lies at the end of a random other arm. It never ends; there's no win or lose.
- **Controls:**
  - Stick moves the dog relative to the screen.
  - LB rotates left 90°, RB rotates right 90°.
  - Y is the 180° turn: the scroll slows through zero, the dog visibly turns around, no pause.
  - Start goes back to the title.
  - LB (pad button 4) is unused today. RB is turbo in v0.2, but the prototype doesn't use turbo, so `input.js` only adds a press signal for it.
- **Swing:** lasts 0.5 s and pauses play. The dog keeps its spot on the screen while the plan turns under it.
  - If the junction is on screen, the swing also slides the window onto the junction.
  - Otherwise the window turns where it is and stops at the wall.
  - Button presses during the swing are ignored.
- **Window movement:** the window follows the corridor centre lines at a constant speed and stops at dead ends.
- **Doors:** one where each arm meets the junction. A door is open when the window is scrolling along that arm, in either direction, so you can also come back out.
- **Art:** floor rectangles with a grid (needed to see scrolling and rotation), dark walls, coloured door bars and bone circles. The existing dachshund sprite (`drawDackel`) costs nothing to reuse and makes the 180° turn visible.

OUT:
- **Loop H–K–X–Y, the diagonal, landmarks, return to H, "Where is H?":** these answer a different question (keeping your bearings across a world). That's prototype 2.
- **45° turns:** same action, but a second thing to judge. Prototype 3.
- **Junction halt zones with free flight:** not needed, because the window already stops at walls.
- **Minimap or compass overlay:** a separate concept, parked by you.
- **Enemies, shooting, health:** a question about pressure. Prototype 4.
- **Logs, counters, pointing prompt:** you watch for the answer yourself; no measuring system.
- **Stick latch:** dropped, as you decided.
- **Save, abilities, Drehzahl, `worldgraph3` / solver:** the prototype is throwaway, so none of its rules go into the real game.
- **Scripted bot, fake-canvas render tests, perf scene, flash test, tester agents:** too much effort for a throwaway.

**3. Timebox and build**

- **Timebox:** one build session of about 3 hours, then you play. If it runs over, drop the random bone choice (use a fixed order) rather than anything the question needs.
- **Written fresh, thrown away later:**
  - `src/proto/fenster.js` for the logic (about 200 lines).
  - `src/proto/fenster-draw.js` for drawing (about 120 lines). It does its own rotation: move to the screen centre, then rotate by −`headingAngle(θ)`.
  - Directions only through the `math.js` helpers (`turnBy`, `opposite`, `DIR_VEC`, `headingAngle`), because `tests/directions.tests.mjs` checks every file under `src/`.
- **Reused:** input handling, the main loop, the menu system, `drawDackel`, `math.js`. No changes to `Level`, `Arena` or `worldgraph3`.
- **Changes to v0.2 code (about 20 lines):**
  - one new screen case in `game.update`;
  - one new case in `renderer.draw`;
  - in `input.js`: `PADMAP` button 4 → rotate left, plus the RB press signal for rotate right;
  - `?proto=fenster` in `main.js`.
- **Getting it on the Deck:** a "Prototyp: Fenster" entry in the **Options menu**, shown only when Options is opened from the title.
  - Not in the title menu: the `Game` constructor opens the title menu, and the golden-master test draws it (`render:titel`). An extra entry would change the fingerprint.
  - Only from the title: Options can also be opened from Pause, and starting the prototype there would throw away a running game.
  - Electron doesn't pass URL parameters through, so `?proto=fenster` is only for E2E tests and the browser.
  - Push to the release branch and the AppImage builds as usual.
- **Minimum safety net:**
  - `npm test` must stay green. The golden master staying unchanged shows v0.2 wasn't touched.
  - `npm run e2e` must stay green.
  - New `tests/fenster.tests.mjs` with 4–5 tests: rotating keeps the scroll side; Y changes only the scroll side; the door rule; 3 minutes of random input never leaves the floor or throws.
  - A throwaway `e2e/fenster.mjs` that takes 4 screenshots (start, mid-swing, after rotate-left, upside down) so the builder can check them before shipping.
  - A review of only the ~20 lines that touch v0.2.

**4. Prototype ladder**

- **If the answer is yes → P2:** "Do I keep my bearings across a world?" The H–K–X–Y loop with landmarks and a return-home task (your draft minus the minimap). The answer tells you whether a minimap is needed at all.
- **If the answer is no (mistakes after 180° or upside down) → P1b:** "Which way should a turn be read?" Same crossroads with a switch between two styles: turns from the dog's point of view (as in P1), or from the screen's (push the stick toward the door plus a button). One build, compared side by side.
- **P3:** "Do 45° turns fit the same action?" Add one diagonal arm (octagonal junction), with the LT/RT triggers for ±45°. This is also where octagon rooms get tried.
- **P4:** "Does the paused swing still work in a fight?" Enemies in the arms, plus shooting.

Parked deliberately, and listed in the prototype file's header so they aren't lost:
- the minimap, after P2;
- forks that need turn abilities (Drehstufen), after P3;
- gentle climb and player-driven shafts, once the turn itself works;
- upside down as a gameplay element, after P1 shows it can be read at all.

**5. Open before building (default in brackets)**

1. 90° turns only in P1, with 45° in P3? [yes]
2. LB/RB to rotate left/right and Y for 180°? This differs from E3's default in `PLAN-v0.3.md` (hold B + stick). [LB/RB]
3. During the swing, does the dog stay at its spot on the screen while the plan turns under it, or stay on the plan and swing with it? [stays on the screen]

### Critical Files for Implementation
- /home/user/SQLLernTool/wendehals/src/game/game.js (the `update` switch and `openOptions`)
- /home/user/SQLLernTool/wendehals/src/render/renderer.js (the `draw` switch)
- /home/user/SQLLernTool/wendehals/src/core/input.js (`PADMAP`, the `poll()` output)
- /home/user/SQLLernTool/wendehals/src/core/math.js (`turnBy`, `opposite`, `DIR_VEC`, `headingAngle`)
- /home/user/SQLLernTool/wendehals/tests/helpers/fingerprint.mjs (draws the title menu, which is why the entry goes in Options)
