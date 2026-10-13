// Die Leveldateien aus levels/ als Startinhalt im Build (esbuild bettet die JSON-Dateien ein). Quelle der Wahrheit sind die Dateien;
// im Electron-Editor kommen sie über den Preload frisch von der Platte (Stufe 2a), das hier ist der Rückfall und der Browser-Start.
import welt from '../../levels/welt.json' with { type: 'json' };
import stempel from '../../levels/stempel.json' with { type: 'json' };
import beispiel from '../../levels/gebiete/beispiel.json' with { type: 'json' };
import netz from '../../levels/gebiete/proto-netz.json' with { type: 'json' };
import achteck from '../../levels/gebiete/proto-achteck.json' with { type: 'json' };

export const WELT = welt;
export const GEBIETE = { beispiel, 'proto-netz': netz, 'proto-achteck': achteck };
export const STEMPEL = stempel;
