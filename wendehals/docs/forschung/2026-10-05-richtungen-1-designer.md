# Game-Designer, Runde 1: Ideen für Links/Rechts-Flug ohne Zoom (vor Robins Skizze)

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

# Wendehals: flying left and right without the vertical zoom-out

## 1. The design problem

The heading (8 compass directions) has to stay the world factor that decides where you can go: arena exits, forks and turn abilities. At the same time the screen stays straight, play stays horizontal, and the world never changes with your heading. The floor stays down, currents keep their direction, and diagonals don't turn surfaces into stairs. One stage format has to work for every heading, and flying a stage against its grain may kill you. Robin wants right-to-left flight. He does not want upward flight, and he wants rid of the 0.5625 zoom, which draws N/S stages at 56 % size.

The solution has to resolve four tensions:
- **Eight headings onto two screen sides.** The 8 map headings have to collapse onto 2 screen directions without the compass becoming cosmetic.
- **"The world rotates around the player" vs. "the world is not affected".** A rotation can only be a transition or a mapping. It can never be a lasting change to the stage.
- **"Turn mid-stage and keep flying" vs. a fixed screen side per stage.** With a fixed side, some 90° turns force you to turn around on screen.
- **Today's W stages already break Robin's rule.** W stages and every Wendehals turn are a 180° rotation with the floor on top (`Level.reverse()` mirrors both `a` and `c`; so does `localToScreen(W)`). That contradicts "gravity doesn't change". In every variant below this must become a horizontal flip only. Defender's Reverse button and Fantasy Zone's two-way scrolling show this reads fine [belegt].

## 2. Ideas

**One technical point covers every horizontal variant.** They differ in a single parameter: whether a given flight runs left or right on screen, and whether the stage may be mirrored horizontally. Rendering, reaction time (480 units visible ahead), levelgen and solver stay the same.

### A+B merged: "Kompass-Seite" (fixed layout, the compass picks the side)

Each stage has one layout and is never mirrored or rotated. Its western end is always on the left. Pure N/S stages follow one global rule: **N = right, S = left**. That is the same 90° clockwise turn of the map for every N/S exit.

- **Pros:**
  - Map and screen agree for every stage with an east or west component.
  - World facts get stable screen directions. The Kühlschrank's falling cold air (S = suction) always flows left.
  - "Wrong orientation" simply means forward vs. backward, which the solver already handles.
- **Cons:**
  - Some 90° turns force a turnaround on screen: E→S does, W→N does, and N→NW does as a 45° turn.
  - Main-path stages flown leftwards have to be authored for leftward play.
- **Pure A** (start always on the left, compass ignored) is simpler to author. But it sends you right while the map says west. I'd only fall back to it if the compass rule feels wrong.
- **Precedents:** 2D maps with horizontal-only stages work. See Darius' zone tree and Super Hydorah's branching world map [belegt]. Gradius V keeps the ship facing right while the stage moves in other directions [belegt].

### C: "Schwenk" (the world swings by the smallest angle)

The game remembers how the world is currently turned on screen. After each turn, the world rotates around the dachshund by the smallest angle that puts the new heading on screen-left or screen-right. Turns up to 90° keep you flying the same way; turns over 90° flip you. This is Robin's 05.10 wording almost exactly.

- **Pros:** It fits mid-stage turns best ("you keep flying").
- **Cons:**
  - Which side you fly a stage on depends on how you turned before. Stages must therefore be mirrorable horizontally. The floor stays down, but furniture appears mirrored, and text has to be drawn unmirrored.
  - The same stage can look mirrored on different visits, so the map and the screen agree less [geschätzt].
- B's "N/S keep your previous side" is C limited to N/S, so I count it here.
- **Worth using in any concept:** C as the transition animation.

### D: keeping some up/down

- **D1, slow vertical autoscroll** (270 units visible, about 0.56× speed). Jamestown plays vertically on full 16:9 and is described as "an acquired taste" [belegt]. Life Force and Axelay alternate horizontal and vertical stages [belegt], but on near-square arcade screens a vertical stage loses only 12–25 % of the view ahead. At 16:9 it loses 44 % [geschätzt; arithmetic]. It also breaks the single stage format.
- **D2, player-driven shafts.** Good metroidvania feel, but it is a third mode (a tall room), not a stage. A possible later room type.
- **D3, gentle climb.** Play stays horizontal; the camera follows rising terrain. Thunder Force IV's taller-than-screen playfields [belegt] and Gradius V show this reads well. It is the cheapest way to make "north = up the house" felt (WELT-DESIGN 4.2 describes the map as a cross-section of the house). Use it as authored flavour, never as a rule, since Robin rejected stairs driven by direction.
- **D4, pillarbox.** Standard for vertical ports, often with HUD side panels such as M2's "gadgets" [belegt]. On the Deck the playfield would be tiny and vertical, so I'd reject it for play and reuse the idea for the HUD (see H below).

### E: making direction visible

- Keep arenas north-up with exits at their compass positions.
- On launch, a 0.5–0.8 s swing (C) from the top-down arena into the side-view stage.
- Compass and minimap dot in the HUD.
- Stage title card with a compass arrow.

This is essential in every variant and cheap to build.

### My own ideas

- **F: top-down for decisions, side view for flying.**
  - Every direction decision happens north-up: in arenas, in fork halt zones, and in the turn overlay.
  - To turn, hold B: a north-up compass rose appears around the dachshund, and the stick picks an absolute heading.
  - The input is then identical in arenas and stages. That avoids "stick up = north or screen-up?" confusion in horizontal stages.
- **G: Darius-style forks.**
  - A mid-stage fork is an upper/lower tunnel split, like Darius' boss fork [belegt].
  - Each tunnel mouth shows its compass heading and opens only if your pre-selected heading matches.
  - Rule when flying right: the upper tunnel is the counter-clockwise branch.
  - This keeps forks inside one horizontal tileset.
- **H: use the Deck's spare screen bars.** On the Deck the game renders at 1280×720 (the `fit` calculation in `main.js`), so 80 px of the 800 px height go unused. A 480×300 canvas on 16:10 screens gives a 30-unit HUD strip for compass, minimap and turn charge without covering play.

## 3. Recommendation

Prototype **Kompass-Seite** and **Schwenk** as one build with a switch. They share about 90 % of the work: the left/right parameter, the flip instead of rotation, the swing transition and the HUD compass. As with E1, Robin decides on the Deck.

This also makes E1 (rotate diagonal stages 45° or use stair terrain) obsolete. Diagonal stages simply become horizontal stages on a diagonal map edge, with no zoom.

**Prototype "Kompass-Kreuz" (`?welt=proto`)**

What's in it:
- One north-up hub arena with exits E, W, N, S and NE, plus a ring.
- Four small end arenas, each with a Wender.
- One plain 60-second stage reused on every edge. It has floor and ceiling, 3 enemy waves, one current toward its south/west end, one hazard that only kills in one direction, and one text sign to judge mirroring.
- Y = 180° flip anywhere.
- The launch swing.
- HUD compass and minimap dot.
- Switches for:
  - **Side rule:** Kompass-Seite / pure A / Schwenk.
  - **HUD placement:** corner / Deck strip.

What's explicitly not in it: forks, turn abilities, turn charge, level design, bosses, diagonal zoom, vertical stages, welt3 data, solver changes.

Step 2, only after the decision: one mid-stage fork, testing G against an F-style halt zone.

**Questions for Robin after playing**
1. On arrival, can you name the direction you came from without looking at the HUD?
2. Does flying left feel as good as flying right? Should flying against the grain look visibly harder?
3. Which bothers you less: Kompass-Seite's turnaround after E→S, or Schwenk's mirrored stages?
4. Does the swing sell "the world rotates around me"? How long may it last?
5. Should the compass always be visible, or only on arrival and when turning? In the corner or in the strip?
6. Did you miss vertical flight? If yes, D3 is next; if not, drop it for good.

## 4. Open questions for Robin

- Is the map a floor plan or a cross-section of the house (north = up the house)? If it's a cross-section, is a label enough, or should N stages climb (D3)?
- Is horizontal mirroring (floor stays down) compatible with "furniture doesn't change"?
- How deadly may "wrong orientation" be: outright unfair traps, or just harder?
- Forks: lanes inside the stage (G), or stop and switch to a top-down view (F)?
- Turn input inside stages: absolute compass, or relative left/right?
- May the game use the Deck's 16:10 bars?

**Sources:**
- [Defender](https://en.wikipedia.org/wiki/Defender_(1981_video_game))
- [Fantasy Zone](https://en.wikipedia.org/wiki/Fantasy_Zone)
- [Salamander/Life Force](https://en.wikipedia.org/wiki/Salamander_(video_game))
- [Axelay](https://en.wikipedia.org/wiki/Axelay)
- [Darius forks](https://shmups.wiki/library/Darius)
- [Darius (StrategyWiki)](https://strategywiki.org/wiki/Darius)
- [Super Hydorah](https://en.wikipedia.org/wiki/Super_Hydorah)
- [Gradius V (GameSpot)](https://www.gamespot.com/reviews/gradius-v-review/1900-6107370/)
- [Thunder Force IV](https://en.wikipedia.org/wiki/Thunder_Force_IV)
- [Vertical shmups on 16:9 / Jamestown](https://shmups.system11.org/viewtopic.php?f=1&t=57910)
- [Vertically scrolling yoko games](https://shmups.system11.org/viewtopic.php?t=53533)
- [M2 gadgets (Nintendo Life)](https://www.nintendolife.com/reviews/nintendo-switch/aleste_collection)

### Critical Files for Implementation
- `/home/user/SQLLernTool/wendehals/src/core/math.js`: `viewDims`, `localToScreen`, `screenToLocalVec`; the left/right parameter goes here.
- `/home/user/SQLLernTool/wendehals/src/game/level.js`: `reverse()` must flip horizontally instead of rotating 180°.
- `/home/user/SQLLernTool/wendehals/src/render/renderer.js`: horizontal mirroring, swing transition, HUD compass.
- `/home/user/SQLLernTool/wendehals/src/game/arena.js`: launch transition and the north-up turn overlay.
- `/home/user/SQLLernTool/wendehals/src/main.js`: letterbox `fit`, for the 480×300 HUD strip on the Deck.
