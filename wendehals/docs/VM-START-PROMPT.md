# Start-Prompt: Begleit-Chat „Wendehals in der VM mit Claude Desktop“

> Diesen Text als erste Nachricht in einen **neuen normalen Claude-Chat** (claude.ai oder Claude Desktop, Modell
> Opus 5.5) einfügen. Entstanden am 11.10.2026 in der Leveldesign-Session.

---

Hallo! Ich bin Robin. Du begleitest mich Schritt für Schritt dabei, mein Spieleprojekt **Wendehals** künftig in einer
**virtuellen Maschine (VM) auf meinem PC mit Claude Desktop** umzusetzen. Antworte auf Deutsch, knapp und klar, immer
nur wenige Schritte auf einmal, und frag nach, bevor du Annahmen über meinen PC triffst.

**Das Projekt:**
- GitHub-Repo `robinderrobin/sqllerntool`, das Spiel liegt im Ordner `wendehals/` (reines JavaScript/ES-Module, Build
  mit esbuild zu einer `dist/index.html`, Desktop-App über Electron 44, Node.js 22, Tests mit `node --test` und
  Playwright/Chromium). Der Rest des Repos (SQL-Lern-Tool, `csharp-engine/`) gehört nicht zum Spiel.
- Bisher arbeite ich mit Claude Code in der Cloud (claude.ai/code). Ein Push auf einen Release-Branch baut per
  GitHub Actions eine Windows-`.exe` und ein Steam-Deck-AppImage; gespielt wird auf dem Steam Deck.
- Gerade entsteht ein **Level-Editor** (Branch `claude/wendehals-editor`), automatisch gebaut von einer nächtlichen
  Claude-Routine in der Cloud. Er speichert Level als JSON-Dateien in `wendehals/levels/`. Ich designe am PC mit Maus
  und Tastatur. Wenn ich ein Level gebaut habe, gebe ich Claude Code eine Bezeichnung wie
  `Wendehals-Level kanal/schleuse@560`, und Claude prüft es.

**Ziel:** Ein lokaler Arbeitsplatz in einer VM, in dem
1. das Repo geklont ist und ich mit Claude Desktop (inkl. Claude Code) direkt daran arbeite,
2. der Editor läuft und meine Level direkt in den Repo-Ordner speichert,
3. Claude Code meine Level lokal liest, prüft und mit mir verbessert,
4. Änderungen per Git committet und zu GitHub gepusht werden (so bleiben Cloud-Routinen, Releases und Steam Deck
   im Takt),
5. Tests (`npm test`, `npm run e2e`) lokal laufen.

**Bitte hilf mir dabei, in dieser Reihenfolge:**
1. Frag nach meinem PC (Betriebssystem, CPU, RAM, freier Speicher, Grafik) und schlag mir eine passende
   VM-Lösung und ein Gast-System vor, mit Begründung (z. B. Hyper-V/VirtualBox/VMware; Windows- oder Linux-Gast).
   Bedenke: Claude Desktop muss im Gast laufen; Electron und Chromium brauchen etwas Grafikleistung.
2. VM anlegen (Größe von CPU/RAM/Platte, Netzwerk, gemeinsame Zwischenablage).
3. Im Gast: Claude Desktop, Git, GitHub-Anmeldung (GitHub Desktop oder `gh`), Node.js 22, Editor/IDE nach Wahl.
4. Repo klonen, `npm ci` im Ordner `wendehals/`, `npm test`, `npm run e2e`, `npm start` (Electron) zum Laufen bringen.
5. Claude Code in Claude Desktop mit dem Repo-Ordner verbinden; erklären, wie die Repo-Datei `CLAUDE.md` und
   `wendehals/CLAUDE.md` dort automatisch gelten.
6. Arbeitsablauf festlegen: Level im Editor bauen → speichern → Claude Code prüfen lassen → committen → pushen;
   wie ich Stände der Cloud-Routine hole (`git pull`) und Konflikte vermeide.
7. Sicherheit und Pflege: Snapshots/Backups der VM, keine Zugangsdaten in Dateien, Updates.

Wenn etwas schiefgeht, lass dir Fehlermeldungen von mir genau geben und löse eins nach dem anderen. Am Ende fass mir den
fertigen Ablauf als kurze Checkliste zusammen, die ich ins Repo legen kann (`wendehals/docs/VM-ARBEITSPLATZ.md`).
