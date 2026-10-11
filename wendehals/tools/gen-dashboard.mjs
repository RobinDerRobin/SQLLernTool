// Erzeugt das Arbeitspakete-Dashboard aus docs/PROTOTYPEN.md und docs/LEVELDESIGN.md.
// Keine Abhängigkeiten. Das Dashboard ist KEINE zweite Wahrheit: es liest nur und rechnet Stand,
// Abhängigkeiten und Modellempfehlung aus den Tabellen ab. Geändert wird nur PROTOTYPEN.md.
//
//   node tools/gen-dashboard.mjs                      → docs/dashboard.html (eigenständig, lokal öffnen)
//   node tools/gen-dashboard.mjs --artifact <datei>   → Seitenteil ohne <!doctype>, für das Artifact-Tool
//   node tools/gen-dashboard.mjs --json               → die gelesenen Daten als JSON (zum Prüfen)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROTO = readFileSync(join(ROOT, 'docs/PROTOTYPEN.md'), 'utf8');
const LEVEL = readFileSync(join(ROOT, 'docs/LEVELDESIGN.md'), 'utf8');

// ---------- Lesen ----------
const strip = (s) => s
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/~~/g, '').replace(/\*\*/g, '').replace(/`/g, '').trim();

/** Abschnitt ab Überschrift (Anfang der Zeile) bis zur nächsten `## `-Überschrift. */
function section(text, headStart) {
  const i = text.split('\n').findIndex((l) => l.startsWith(headStart));
  if (i < 0) throw new Error(`Abschnitt fehlt: ${headStart}`);
  const lines = text.split('\n').slice(i + 1);
  const end = lines.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? lines : lines.slice(0, end)).join('\n');
}

/** Erste Markdown-Tabelle im Text → Zeilen aus Zellen (roh, mit Markdown). */
function table(text, firstHeaderCell) {
  const rows = [];
  let on = false;
  for (const l of text.split('\n')) {
    if (!l.startsWith('|')) { if (on) break; continue; }
    const cells = l.replace(/^\||\|\s*$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());
    if (!on) { if (cells[0] !== firstHeaderCell) continue; on = true; continue; }
    if (/^[-: ]+$/.test(cells[0])) continue;
    rows.push(cells);
  }
  if (!rows.length) throw new Error(`Tabelle fehlt: ${firstHeaderCell}`);
  return rows;
}

const wortlaut = (s) => strip(s).replace(/\s+/g, ' ');

// Entscheidungsregister (Abschnitt 3)
const decisions = table(section(PROTO, '## 3.'), '#').map(([id, frage, stand]) => {
  const st = wortlaut(stand);
  let art = 'offen';
  if (/erledigt|obsolet|ersetzt durch/.test(st)) art = 'erledigt';
  else if (/^ruht|\bruht\b/.test(st)) art = 'ruht';
  return { id, frage: wortlaut(frage), stand: st, art };
});

// Prototyp-Leiter (Abschnitt 4)
const protos = table(section(PROTO, '## 4. '), 'ID').map(([idRaw, frage, stand]) => {
  const idText = wortlaut(idRaw);
  const m = idText.match(/^(P\d+[a-z]?)\s*(?:„([^“]*)“)?/);
  const st = wortlaut(stand);
  let art = 'sonst';
  if (/^keep/.test(st)) art = 'keep';
  else if (/wartet auf Robins Spieltest/.test(st)) art = 'spieltest';
  else if (/^wartet auf P\d/.test(st)) art = 'wartet';
  const brief = (stand.match(/prototypen\/([\w-]+\.md)/) || [])[1] || null;
  return { id: m[1], name: m[2] || null, frage: wortlaut(frage), stand: st, art, brief };
});

// Arbeitspakete (Abschnitt 6)
const protoIdsIn = (s) => [...s.matchAll(/\bP\d+[a-z]?\b/g)].map((x) => x[0]);
const packages = table(section(PROTO, '## 6.'), '#').map(([nr, name, art, frage, erst, haengt]) => {
  const strichen = /~~/.test(nr) || /gestrichen/.test(art);
  const id = wortlaut(nr);
  const hard = wortlaut(haengt).split(';')[0];
  const deps = [];
  for (const m of hard.matchAll(/(\d+)\s*[–-]\s*(\d+)|\b(\d+)\b|\b(S|Q)\b/g)) {
    if (m[1]) for (let k = +m[1]; k <= +m[2]; k++) deps.push(String(k));
    else deps.push(m[3] || m[4]);
  }
  return {
    id, name: wortlaut(name), art: wortlaut(art).replace(/\s*\(.*$/, ''), strichen,
    frage: wortlaut(frage), erst: wortlaut(erst), haengtRoh: wortlaut(haengt),
    deps: /^P\d/.test(hard) ? [] : [...new Set(deps)],
    protoDeps: protoIdsIn(hard),
    protos: strichen ? [] : protoIdsIn(wortlaut(erst)),
    notiz: /festgelegt/.test(nr + art + name) ? 'festgelegt (Robin, 11.10.2026)' : '',
  };
});

// Prototypen ohne Paket-Zeile gehören zur Leiter von Paket 1.
const claimed = new Set(packages.flatMap((p) => p.protos));
const p1 = packages.find((p) => p.id === '1');
for (const pr of protos) if (!claimed.has(pr.id)) p1.protos.push(pr.id);
const protoById = Object.fromEntries(protos.map((p) => [p.id, p]));

// ---------- Ableiten: Stand, nächster Schritt, Modell ----------
// Regel aus der Modellwahl-Tabelle (PROTOTYPEN.md Abschnitt 1): Design/Konzept/Entscheidung/Papier/Löser → Opus,
// Bauen/Testen → Sonnet, Kleinkram → Haiku.
const protoLabel = (p) => `${p.id}${p.name ? ` „${p.name}“` : ''}`;
const OPUS = 'Opus 5.5', SONNET = 'Sonnet 5.5', HAIKU = 'Haiku 4.5';

for (const p of packages) {
  const pr = p.protos.map((i) => protoById[i]).filter(Boolean);
  const offenerRest = pr.some((x) => x.art === 'keep' && /offen/.test(x.stand));
  if (p.strichen) {
    Object.assign(p, { stand: 'gestrichen', standText: 'Gestrichen (Robin, 10.10.2026)', schritt: '–', modell: null, warteAufRobin: false });
    continue;
  }
  const wartend = pr.filter((x) => x.art === 'spieltest');
  const frei = pr.filter((x) => x.art === 'wartet');
  const keep = pr.filter((x) => x.art === 'keep');
  const label = (x) => `${x.id}${x.name ? ` „${x.name}“` : ''}`;
  const offeneDeps = p.deps.filter((d) => {
    const q = packages.find((k) => k.id === d);
    return q && !q.strichen && !/^(keep|läuft)/.test(q.stand || 'offen');
  }).map((d) => 'Paket ' + d).concat(p.protoDeps.filter((d) => protoById[d] && protoById[d].art !== 'keep').map((d) => protoLabel(protoById[d])));

  if (pr.length) {
    if (wartend.length) {
      p.stand = 'spieltest';
      p.standText = `läuft: ${keep.length} keep, ${wartend.length} warten auf Spieltest`;
      p.schritt = `Robin spielt ${wartend.map(label).join(' und ')} (~5 Min am Deck) und antwortet in 3 Zeilen. Danach Urteil keep/kill/iterate/park ins Protokoll.`;
      p.modell = OPUS; p.modellGrund = 'Urteil, nächster Brief';
      p.warteAufRobin = true;
    } else if (keep.length && keep.length === pr.length) {
      p.stand = 'keep';
      p.standText = offenerRest ? 'Prototyp keep, Details offen' : 'Prototyp keep';
      p.schritt = offenerRest ? 'Offene Details klären (siehe Prototyp-Stand).' : 'Übernahme in die Engine nach Paket 8.';
      p.modell = OPUS; p.modellGrund = 'offene Wahl klären';
      p.warteAufRobin = offenerRest;
    } else {
      p.stand = 'offen';
      p.standText = 'noch nicht begonnen';
      p.schritt = `Nächster Prototyp: ${frei.concat(pr).map(label)[0]}.`;
      p.modell = OPUS; p.modellGrund = 'Deutung und Brief, danach Sonnet 5.5 bauen';
    }
  } else if (p.id === '13') {
    p.stand = 'festgelegt';
    p.standText = 'festgelegt, noch nichts gebaut';
    p.schritt = 'Stufe E1 erst bauen, wenn Robin beim Bauen eines echten Levels etwas vermisst. Vorher: offene Fragen aus LEVELDESIGN.md Abschnitt 3.';
    p.modell = SONNET; p.modellGrund = 'Bau-Sessions laut LEVELDESIGN.md; Brief zu E1 zuerst mit Opus 5.5';
  } else {
    p.stand = offeneDeps.length ? 'wartet' : 'offen';
    p.standText = offeneDeps.length ? `wartet auf ${offeneDeps.join(', ')}` : 'noch nicht begonnen';
    p.schritt = offeneDeps.length ? `Erst ${offeneDeps.join(', ')} klären.` : `Kernfrage klären: ${p.frage}`;
    if (/^(Entscheidung|Papier)/.test(p.art)) { p.modell = OPUS; p.modellGrund = 'Entscheidung/Planung'; }
    else if (/^Produktion/.test(p.art) && /Engine|Regel|Löser/.test(p.frage + p.erst)) { p.modell = OPUS; p.modellGrund = 'Regel-/Engine-Umbau, danach Sonnet 5.5 testen'; }
    else if (/^Prototyp|^Produktion|^Werkzeug/.test(p.art)) { p.modell = OPUS; p.modellGrund = 'Deutung und Brief, danach Sonnet 5.5 bauen'; }
    else { p.modell = SONNET; p.modellGrund = 'laufend, Bauen und Testen'; }
  }
  if (p.id === 'Q') { p.stand = 'laufend'; p.standText = 'läuft nebenher'; p.schritt = 'Je Paket mitführen, kein eigener Termin.'; p.modell = SONNET; p.modellGrund = 'Bauen und Testen'; }
  p.warteAufRobin ??= false;
}

// Editor-Stufen E1–E5 (LEVELDESIGN.md)
const editorRows = table(section(LEVEL, '## 1.'), 'Stufe');
const editor = editorRows.map(([id, inhalt, est]) => ({ id: wortlaut(id), inhalt: wortlaut(inhalt), schaetzung: wortlaut(est) }));
const editorOffen = section(LEVEL, '## 3.').split('\n').filter((l) => l.startsWith('- ')).map((l) => wortlaut(l.slice(2)));
const editorRegel = 'Eine Stufe wird erst gebaut, wenn Robin sie beim Bauen eines echten Levels vermisst.';

// Protokoll (Abschnitt 5)
const protokoll = table(section(PROTO, '## 5.'), 'ID').map(([id, datum, thema, antwort, urteil, schritt]) =>
  ({ id: wortlaut(id), datum: wortlaut(datum), thema: wortlaut(thema), antwort: wortlaut(antwort), urteil: wortlaut(urteil), schritt: wortlaut(schritt) }));

const datumDe = (s) => s.replace(/(\d+)\.(\d+)\.(\d+)/, '$3-$2-$1');
const stand = [...PROTO.matchAll(/\b\d{2}\.\d{2}\.20\d\d\b/g)].map((m) => m[0]).sort((a, b) => datumDe(a) < datumDe(b) ? -1 : 1).pop();

const data = { stand, packages, protos, decisions, editor, editorOffen, protokoll };
if (process.argv.includes('--json')) { console.log(JSON.stringify(data, null, 1)); process.exit(0); }

// ---------- HTML ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const modellKlasse = (m) => (m === OPUS ? 'm-opus' : m === SONNET ? 'm-sonnet' : 'm-haiku');
const modellChip = (m) => (m ? `<span class="chip ${modellKlasse(m)}">${esc(m)}</span>` : '');
const STAND = {
  spieltest: ['Wartet auf Robin', 'wait'], keep: ['keep', 'ok'], offen: ['offen', 'idle'], wartet: ['blockiert', 'block'],
  festgelegt: ['festgelegt', 'plan'], gestrichen: ['gestrichen', 'gone'], laufend: ['laufend', 'plan'],
};
const standChip = (k) => `<span class="chip s-${STAND[k][1]}">${STAND[k][0]}</span>`;
const pkgLabel = (id) => (/^\d+$/.test(id) ? `Paket ${id}` : id === 'S' ? 'Paket S' : 'Paket Q');

const aktive = packages.filter((p) => !p.strichen);
const wartendeProtos = protos.filter((p) => p.art === 'spieltest');
const offeneEntsch = decisions.filter((d) => d.art === 'offen');
const naechstes = packages.filter((p) => p.warteAufRobin);

const htmlPackages = packages.map((p) => {
  const deps = p.deps.length || p.protoDeps.length
    ? `<div class="deps"><span class="lbl">hängt ab von</span> ${[...p.deps.map((d) => {
        const q = packages.find((k) => k.id === d);
        return `<span class="dep s-${q ? STAND[q.stand][1] : 'idle'}" title="${esc(q ? q.standText : '')}">${esc(pkgLabel(d))}</span>`;
      }), ...p.protoDeps.map((d) => `<span class="dep s-idle">${esc(protoById[d] ? protoLabel(protoById[d]) : d)}</span>`)].join(' ')}</div>`
    : p.strichen ? '' : '<div class="deps"><span class="lbl">hängt ab von</span> <span class="dep s-ok">nichts</span></div>';
  const protoLine = p.protos.length
    ? `<div class="deps"><span class="lbl">Prototypen</span> ${p.protos.map((i) => protoById[i]).filter(Boolean).map((x) => `<span class="dep s-${x.art === 'keep' ? 'ok' : x.art === 'spieltest' ? 'wait' : 'idle'}">${esc(protoLabel(x))}</span>`).join(' ')}</div>`
    : '';
  const extra = p.haengtRoh.includes(';') ? `<div class="note">Später zusätzlich: ${esc(p.haengtRoh.split(';').slice(1).join(';').trim())}</div>` : '';
  return `<article class="card${p.strichen ? ' gone' : ''}${p.warteAufRobin ? ' attn' : ''}" id="p-${esc(p.id)}">
  <header><span class="nr">${esc(p.id)}</span><h3>${esc(p.name)}</h3>${standChip(p.stand)}</header>
  <p class="meta">${esc(p.art)}${p.notiz ? ' · ' + esc(p.notiz) : ''} · <span class="std">${esc(p.standText)}</span></p>
  ${p.strichen ? '' : `<p class="q">${esc(p.frage)}</p>
  ${deps}${protoLine}${extra}
  <div class="step"><span class="lbl">Nächster Schritt</span><p>${esc(p.schritt)}</p></div>
  <div class="mod">${modellChip(p.modell)}<span class="why">${esc(p.modellGrund || '')}</span></div>`}
</article>`;
}).join('\n');

const htmlProtos = protos.map((p) => `<article class="card${p.art === 'spieltest' ? ' attn' : ''}">
  <header><span class="nr">${esc(p.id)}</span><h3>${p.name ? `„${esc(p.name)}“` : '<span class="muted">Name fehlt (Regel 9)</span>'}</h3>
  ${p.art === 'spieltest' ? '<span class="chip s-wait">Wartet auf Robins Spieltest</span>' : p.art === 'keep' ? '<span class="chip s-ok">keep</span>' : p.art === 'wartet' ? '<span class="chip s-block">blockiert</span>' : '<span class="chip s-idle">offen</span>'}</header>
  <p class="q">${esc(p.frage)}</p>
  <p class="meta">${esc(p.stand)}</p>
  ${p.brief ? `<p class="meta">Brief: <code>docs/prototypen/${esc(p.brief)}</code></p>` : ''}
</article>`).join('\n');

const decRow = (d) => `<li class="dec ${d.art}"><span class="id">${esc(d.id)}</span><div><p>${esc(d.frage)}</p><p class="meta">${esc(d.stand)}</p></div></li>`;
const htmlDec = offeneEntsch.map(decRow).join('\n');
const htmlDecDone = decisions.filter((d) => d.art !== 'offen').map(decRow).join('\n');

const htmlEditor = editor.map((e) => `<li class="stage"><span class="nr">${esc(e.id)}</span><div><p>${esc(e.inhalt)}</p>
  <p class="meta">${esc(e.schaetzung)} Sitzung${e.schaetzung === '1' ? '' : 'en'} · ${modellChip(SONNET)} · noch nicht gebaut</p></div></li>`).join('\n');

const htmlLog = protokoll.map((l) => `<li class="log"><p><strong>${esc(l.id)}</strong> · ${esc(l.datum)} · ${esc(l.thema)} <span class="chip s-idle">${esc(l.urteil)}</span></p>
  <p class="meta">${esc(l.antwort)}</p><p class="meta">Nächster Schritt: ${esc(l.schritt)}</p></li>`).join('\n');

const attention = [
  ...wartendeProtos.map((p) => `<li><strong>Spieltest:</strong> ${esc(protoLabel(p))}</li>`),
  ...(offeneEntsch.length ? [`<li><strong>${offeneEntsch.length} offene Entscheidungen</strong> im Register (${offeneEntsch.map((d) => esc(d.id)).join(', ')})</li>`] : []),
].join('');

const body = `
<main>
<header class="top">
  <p class="eyebrow">Wendehals · Projektstand</p>
  <h1>Arbeitspakete</h1>
  <p class="sub">Stand der Quelle: ${esc(stand)}. Erzeugt aus <code>docs/PROTOTYPEN.md</code> und <code>docs/LEVELDESIGN.md</code>.</p>
  <nav aria-label="Abschnitte"><a href="#heute">Heute</a><a href="#pakete">Pakete</a><a href="#proto">Prototypen</a><a href="#entsch">Entscheidungen</a><a href="#editor">Editor</a></nav>
</header>

<section id="heute" class="today">
  <h2>Was von dir gebraucht wird</h2>
  <ul class="bigs">${attention}</ul>
  <div class="counts">
    <div><b>${aktive.length}</b><span>Pakete aktiv<br><small>(5 gestrichen)</small></span></div>
    <div><b>${protos.length}</b><span>Prototypen<br><small>${protos.filter((p) => p.art === 'keep').length} keep</small></span></div>
    <div><b>${wartendeProtos.length}</b><span>warten auf Spieltest</span></div>
    <div><b>${offeneEntsch.length}</b><span>offene Entscheidungen</span></div>
  </div>
</section>

<section id="pakete">
  <h2>Arbeitspakete 1–13, S, Q</h2>
  <p class="legend">Modell-Empfehlung nach der festen Regel: Opus 5.5 für Design, Konzept, Planung und Regel-Logik; Sonnet 5.5 zum Bauen und Testen; Haiku 4.5 für Kleinkram. Kein Fable.</p>
  <div class="grid">${htmlPackages}</div>
</section>

<section id="proto">
  <h2>Prototypen</h2>
  <div class="grid">${htmlProtos}</div>
  <p class="legend">Geparkt: große Karte, Gabelungen mit Drehfähigkeiten, sanftes Steigen, Schächte, kopfüber als Spielelement, Form der Arenen im gedrehten Fenster.</p>
</section>

<section id="entsch">
  <h2>Offene Entscheidungen</h2>
  <ul class="list">${htmlDec}</ul>
  <details><summary>Erledigt, ruhend oder ersetzt (${decisions.length - offeneEntsch.length})</summary><ul class="list">${htmlDecDone}</ul></details>
  <details><summary>Entscheidungsprotokoll (${protokoll.length})</summary><ul class="list">${htmlLog}</ul></details>
</section>

<section id="editor">
  <h2>Editor, Paket 13: Stufen E1–E5</h2>
  <p class="legend">${esc(editorRegel)} Die Textdatei geht immer auch ohne Editor.</p>
  <ol class="list stages">${htmlEditor}</ol>
  <h3 class="sub2">Offene Fragen zum Editor</h3>
  <ul class="plain">${editorOffen.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
</section>

<footer>
  <p>Nicht von Hand ändern. Nach jeder Änderung an <code>docs/PROTOTYPEN.md</code> oder <code>docs/LEVELDESIGN.md</code>: <code>node tools/gen-dashboard.mjs</code> und Artifact neu veröffentlichen.</p>
</footer>
</main>`;

const css = `
/* Layout: einspaltig am Handy, Karten-Raster ab 40rem; Aufmerksamkeit (orange) nur für „wartet auf Robin“. */
:root {
  --bg: #f3f1ec; --surface: #fbfaf7; --ink: #23221f; --muted: #6a675f; --line: #dcd8cf;
  --attn: #c4410c; --attn-bg: #fbe9df;
  --ok: #1d6b45; --ok-bg: #dcefe3; --block: #8a3a3a; --block-bg: #f3dfdf;
  --idle: #5b5a55; --idle-bg: #e7e4dc; --plan: #2b5c8f; --plan-bg: #dce8f4;
  --opus: #5b3d96; --opus-bg: #e8e0f5; --sonnet: #1f5f8b; --sonnet-bg: #d9eaf6; --haiku: #2c6b3a; --haiku-bg: #dff0dc;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #17181a; --surface: #202225; --ink: #ecebe6; --muted: #a09d94; --line: #34363a;
  --attn: #ff8a50; --attn-bg: #3b2519; --ok: #6fcf9a; --ok-bg: #1b3326; --block: #e99a9a; --block-bg: #3a2222;
  --idle: #b4b2aa; --idle-bg: #2c2e32; --plan: #8bb8e8; --plan-bg: #1f2e3f;
  --opus: #c4a9f5; --opus-bg: #2d2342; --sonnet: #8cc4ec; --sonnet-bg: #1c2f3e; --haiku: #98d6a0; --haiku-bg: #1e3321; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #17181a; --surface: #202225; --ink: #ecebe6; --muted: #a09d94; --line: #34363a;
  --attn: #ff8a50; --attn-bg: #3b2519; --ok: #6fcf9a; --ok-bg: #1b3326; --block: #e99a9a; --block-bg: #3a2222;
  --idle: #b4b2aa; --idle-bg: #2c2e32; --plan: #8bb8e8; --plan-bg: #1f2e3f;
  --opus: #c4a9f5; --opus-bg: #2d2342; --sonnet: #8cc4ec; --sonnet-bg: #1c2f3e; --haiku: #98d6a0; --haiku-bg: #1e3321; color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.45; padding-inline: 16px; }
main { max-width: 64rem; margin-inline: auto; display: flex; flex-direction: column; gap: 2.5rem; padding-block: 1.25rem 3rem; }
code { font-family: var(--mono); font-size: .85em; background: var(--idle-bg); padding: .05em .3em; border-radius: 3px; overflow-wrap: anywhere; }
h1, h2, h3 { text-wrap: balance; margin: 0; }
h1 { font-size: 2rem; letter-spacing: -.01em; }
h2 { font-size: 1.25rem; padding-bottom: .5rem; border-bottom: 2px solid var(--ink); margin-bottom: 1rem; }
h3 { font-size: 1.05rem; flex: 1; min-width: 0; }
p { margin: 0; }
section { min-width: 0; }
.eyebrow { font-family: var(--mono); font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.sub { color: var(--muted); font-size: .9rem; margin-top: .4rem; }
nav { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
nav a { color: var(--ink); border: 1px solid var(--line); background: var(--surface); padding: .45rem .8rem; border-radius: 999px; text-decoration: none; font-size: .9rem; }
nav a:hover, nav a:focus-visible { border-color: var(--ink); outline: 2px solid var(--ink); outline-offset: 2px; }
.today { background: var(--surface); border: 1px solid var(--line); border-left: 6px solid var(--attn); padding: 1.1rem; border-radius: 6px; }
.today h2 { border: 0; padding: 0; margin-bottom: .6rem; }
.bigs { list-style: none; margin: 0 0 1rem; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
.bigs li { background: var(--attn-bg); color: var(--ink); padding: .6rem .8rem; border-radius: 4px; }
.counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .75rem; }
.counts div { display: flex; gap: .6rem; align-items: center; min-width: 0; }
.counts b { font-size: 1.9rem; font-variant-numeric: tabular-nums; min-width: 2ch; }
.counts span { font-size: .85rem; color: var(--muted); line-height: 1.25; }
.legend { color: var(--muted); font-size: .9rem; margin-bottom: 1rem; max-width: 65ch; }
.grid { display: grid; grid-template-columns: 1fr; gap: .9rem; }
@media (min-width: 40rem) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 1rem; display: flex; flex-direction: column; gap: .6rem; min-width: 0; }
.card.attn { border-color: var(--attn); box-shadow: 0 0 0 1px var(--attn); }
.card.gone { opacity: .6; }
.card header { display: flex; flex-wrap: wrap; align-items: flex-start; gap: .5rem; }
.nr { font-family: var(--mono); font-weight: 700; background: var(--ink); color: var(--bg); border-radius: 4px; padding: .1rem .45rem; font-size: .85rem; }
.meta { color: var(--muted); font-size: .85rem; overflow-wrap: anywhere; }
.muted { color: var(--muted); font-weight: 400; }
.q { font-size: .95rem; }
.lbl { font-family: var(--mono); font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.deps { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
.dep { font-size: .8rem; padding: .1rem .5rem; border-radius: 999px; border: 1px solid currentColor; }
.note { font-size: .8rem; color: var(--muted); }
.step { border-top: 1px dashed var(--line); padding-top: .6rem; display: flex; flex-direction: column; gap: .2rem; }
.step p { font-size: .95rem; }
.mod { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.why { font-size: .8rem; color: var(--muted); }
.chip { font-size: .75rem; font-weight: 600; padding: .15rem .55rem; border-radius: 999px; white-space: nowrap; }
.s-wait { color: var(--attn); background: var(--attn-bg); } .dep.s-wait { color: var(--attn); }
.s-ok { color: var(--ok); background: var(--ok-bg); } .dep.s-ok { color: var(--ok); }
.s-block { color: var(--block); background: var(--block-bg); } .dep.s-block { color: var(--block); }
.s-idle { color: var(--idle); background: var(--idle-bg); } .dep.s-idle { color: var(--idle); }
.s-plan { color: var(--plan); background: var(--plan-bg); } .dep.s-plan { color: var(--plan); }
.s-gone { color: var(--idle); background: var(--idle-bg); text-decoration: line-through; } .dep.s-gone { color: var(--idle); }
.dep { background: transparent !important; }
.m-opus { color: var(--opus); background: var(--opus-bg); } .m-sonnet { color: var(--sonnet); background: var(--sonnet-bg); } .m-haiku { color: var(--haiku); background: var(--haiku-bg); }
.list, .plain { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .6rem; }
.plain { list-style: disc; padding-left: 1.2rem; gap: .35rem; }
.dec, .stage, .log { display: flex; gap: .7rem; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: .75rem .9rem; min-width: 0; }
.log { flex-direction: column; gap: .3rem; }
.dec > div, .stage > div { min-width: 0; display: flex; flex-direction: column; gap: .25rem; }
.dec.offen { border-left: 4px solid var(--attn); }
.dec .id { font-family: var(--mono); font-weight: 700; min-width: 3ch; }
.stage .meta { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
.sub2 { margin: 1.2rem 0 .6rem; font-size: 1rem; flex: none; }
details { margin-top: 1rem; } summary { cursor: pointer; font-weight: 600; padding: .4rem 0; } details .list { margin-top: .5rem; }
footer { color: var(--muted); font-size: .85rem; border-top: 1px solid var(--line); padding-top: 1rem; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
`;

const titel = 'Wendehals Arbeitspakete';
const fragment = `<title>${titel}</title>\n<style>${css}</style>\n${body}\n`;
const artIdx = process.argv.indexOf('--artifact');
if (artIdx > 0) {
  writeFileSync(process.argv[artIdx + 1], fragment);
} else {
  const out = join(ROOT, 'docs/dashboard.html');
  writeFileSync(out, `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${fragment}</html>\n`);
  console.log(`geschrieben: docs/dashboard.html (${packages.length} Pakete, ${protos.length} Prototypen, ${decisions.length} Entscheidungen)`);
}
