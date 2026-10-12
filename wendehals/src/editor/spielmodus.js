// „Spielen ab hier“ – Oberfläche (Stufe 3): zeigt den Fenster-Prototyp über dem Editor, Esc führt zurück. Der Editorzustand wird
// nicht angefasst (der Editor liegt nur darunter); die Spielzeit läuft im festen 60-Hz-Takt wie im Spiel.
import { Input } from '../core/input.js';
import { drawFenster } from '../proto/fenster-draw.js';
import { SCREEN_W, SCREEN_H } from './konstanten.js';

const SCHRITT = 1 / 60;

/** Kleiner Ereignisverteiler: Input hört hier statt am window, damit die Editor-Eingabefelder nie von Spieltasten gestört werden. */
function ereignisBus() {
  const h = {};
  return {
    addEventListener: (typ, fn) => (h[typ] ??= []).push(fn),
    senden: (e) => (h[e.type] ?? []).forEach((fn) => fn(e)),
  };
}

export class SpielModus {
  /** `szene` = FensterScene, `host` = Element, in das die Fläche kommt, `beiEnde` = Rückruf nach Esc/Start. */
  constructor(szene, host, beiEnde, { echtzeit = () => true } = {}) {
    this.szene = szene;
    this.beiEnde = beiEnde;
    this.echtzeit = echtzeit;
    this.zeit = 0;
    this.rest = 0;
    this.aktiv = true;
    this.bus = ereignisBus();
    this.input = new Input(this.bus);
    this.deckel = document.createElement('div');
    this.deckel.id = 'spiel';
    this.deckel.style.cssText = 'position:fixed;inset:0;z-index:50;background:#000;display:flex;align-items:center;justify-content:center';
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'spiel-canvas';
    this.canvas.style.cssText = 'display:block;image-rendering:auto';
    const hinweis = document.createElement('div');
    hinweis.id = 'spiel-hinweis';
    hinweis.textContent = 'Esc / Start: zurück zum Editor';
    hinweis.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;text-align:center;color:#c9c6d4;font:13px system-ui,sans-serif;pointer-events:none';
    this.deckel.append(this.canvas, hinweis);
    host.append(this.deckel);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.ein = (e) => {
      if (!this.aktiv) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // sonst wählt der Editor beim selben Tastendruck „nichts“ (Esc = Auswahl aufheben)
        if (e.type === 'keydown') this.beende();
        return;
      }
      this.bus.senden(e);
      if (e.type === 'keydown') e.stopPropagation(); // der Editor darunter bekommt keine Spieltasten
    };
    this.blur = () => this.bus.senden({ type: 'blur' });
    window.addEventListener('keydown', this.ein, true);
    window.addEventListener('keyup', this.ein, true);
    window.addEventListener('blur', this.blur);
    this.passeAn = () => this.groesse();
    window.addEventListener('resize', this.passeAn);
    this.groesse();
    this.zeichne();
    this.letzte = performance.now();
    this.raf = requestAnimationFrame((t) => this.schleife(t));
  }

  groesse() {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(0.5, Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H));
    this.faktor = k;
    this.canvas.style.width = `${SCREEN_W * k}px`;
    this.canvas.style.height = `${SCREEN_H * k}px`;
    this.canvas.width = Math.round(SCREEN_W * k * dpr);
    this.canvas.height = Math.round(SCREEN_H * k * dpr);
    this.skala = (SCREEN_W * k * dpr) / SCREEN_W;
    this.zeichne();
  }

  zeichne() {
    this.ctx.setTransform(this.skala, 0, 0, this.skala, 0, 0);
    drawFenster(this.ctx, this.szene);
  }

  /** Einen festen Schritt (1/60 s) simulieren. Gibt true zurück, wenn die Eingabe „Start/Pause“ war (beendet den Modus). */
  schritt(eingabe = this.input.poll()) {
    this.szene.update(SCHRITT, eingabe);
    this.szene.sfx.length = 0;
    this.zeit += SCHRITT;
    if (eingabe.pause) this.beende();
  }

  /** Zeit voranschreiten lassen (Sekunden) – von der Schleife und von Tests aufgerufen. */
  tick(dt) {
    this.rest += dt;
    while (this.aktiv && this.rest >= SCHRITT) {
      this.rest -= SCHRITT;
      this.schritt();
    }
    if (this.aktiv) this.zeichne();
  }

  schleife(jetzt) {
    if (!this.aktiv) return;
    const dt = Math.min(0.1, (jetzt - this.letzte) / 1000);
    this.letzte = jetzt;
    if (this.echtzeit()) this.tick(dt);
    this.raf = requestAnimationFrame((t) => this.schleife(t));
  }

  beende() {
    if (!this.aktiv) return;
    this.aktiv = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.ein, true);
    window.removeEventListener('keyup', this.ein, true);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('resize', this.passeAn);
    this.deckel.remove();
    this.beiEnde();
  }
}
