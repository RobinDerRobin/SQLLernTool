// Speicher-Adapter (Brief Abschnitt 3/4): Leveldateien öffnen und speichern.
//  - Electron (`npm run editor`): direkt in wendehals/levels/ des lokalen Klons, über den Preload (nur dieser Ordner, siehe electron/main.cjs).
//  - Chrome/Edge: File System Access API (Speichern-Dialog, danach direkt in dieselbe Datei).
//  - sonst: Download und Upload über ein Dateifeld.
// Alle Funktionen sind async und geben bei „abgebrochen“ null zurück; Fehler werfen einen Error mit verständlicher Meldung.

const TYPEN = [{ description: 'Leveldatei (JSON)', accept: { 'application/json': ['.json'] } }];
const abgebrochen = (e) => e && (e.name === 'AbortError' || e.name === 'NotAllowedError' && /cancel|abort/i.test(e.message || ''));

/**
 * `umgebung` nur für Tests: { nativ, fenster, dokument }. Die Art kann mit `setzeArt` erzwungen werden ('nativ' | 'datei' | 'download').
 */
export function erzeugeSpeicher(umgebung = {}) {
  const fenster = umgebung.fenster ?? globalThis.window ?? {};
  const dok = umgebung.dokument ?? globalThis.document;
  const nativ = umgebung.nativ ?? fenster.wendehalsNative?.levels ?? null;
  const handles = new Map(); // Dateiname → FileSystemFileHandle (damit „Speichern“ ohne neuen Dialog in dieselbe Datei schreibt)
  const s = {
    art: nativ ? 'nativ' : fenster.showSaveFilePicker ? 'datei' : 'download',
    setzeArt(art) {
      s.art = art;
    },
    /** Alle Leveldateien frisch von der Platte (nur Electron): { welt: Text, gebiete: { id: Text } } oder null. */
    async ladeAlle() {
      if (s.art !== 'nativ' || !nativ) return null;
      return nativ.alle();
    },
    /** Speichert `text` unter `pfad` (z. B. „gebiete/kanal.json“ oder „welt.json“). Gibt { wo } zurück. */
    async sichere(pfad, text) {
      const name = pfad.split('/').pop();
      if (s.art === 'nativ') {
        await nativ.schreibe(pfad, text);
        return { wo: `levels/${pfad}` };
      }
      if (s.art === 'datei') {
        try {
          let h = handles.get(name);
          if (!h) h = await fenster.showSaveFilePicker({ suggestedName: name, types: TYPEN });
          const w = await h.createWritable();
          await w.write(text);
          await w.close();
          handles.set(name, h);
          return { wo: h.name };
        } catch (e) {
          if (abgebrochen(e)) return null;
          throw new Error('Speichern in die Datei ging nicht: ' + e.message);
        }
      }
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = dok.createElement('a');
      a.href = url;
      a.download = name;
      dok.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return { wo: `Downloads/${name}` };
    },
    /** Lässt eine Datei wählen und gibt { name, text } zurück (null: abgebrochen). */
    async lade() {
      if (s.art === 'datei' && fenster.showOpenFilePicker) {
        try {
          const [h] = await fenster.showOpenFilePicker({ types: TYPEN });
          const f = await h.getFile();
          handles.set(f.name, h);
          return { name: f.name, text: await f.text() };
        } catch (e) {
          if (abgebrochen(e)) return null;
          throw new Error('Öffnen der Datei ging nicht: ' + e.message);
        }
      }
      return new Promise((ok, fehler) => {
        const eingabe = dok.createElement('input');
        eingabe.type = 'file';
        eingabe.accept = '.json,application/json';
        eingabe.style.display = 'none';
        eingabe.addEventListener('change', async () => {
          const f = eingabe.files[0];
          eingabe.remove();
          if (!f) return ok(null);
          try {
            ok({ name: f.name, text: await f.text() });
          } catch (e) {
            fehler(new Error('Lesen der Datei ging nicht: ' + e.message));
          }
        });
        eingabe.addEventListener('cancel', () => {
          eingabe.remove();
          ok(null);
        });
        dok.body.append(eingabe);
        eingabe.click();
      });
    },
  };
  return s;
}
