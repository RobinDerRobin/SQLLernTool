// Werkzeugliste: ein neues Werkzeug = eine Datei in diesem Ordner plus ein Eintrag hier (und ein Kürzel in konstanten.js).
// Ein Werkzeug ist ein Objekt { id, name, hinweis, down(k, p) → true wenn erfasst, move, up, klick, schweben, abbruch, vorschau(ctx, k) }.
// `k` ist der Kontext aus main.js (gebiet(), ansicht, state, aendere(), waehle(), treffer(), tolE(), hinweis(), zeichnen()),
// `p` der Zeigerpunkt { px, py (Bildschirm), x, y (Welt) }.
import auswahl from './auswahl.js';
import gang from './gang.js';
import knoten from './knoten.js';
import formteil from './formteil.js';
import wand from './wand.js';
import hindernis from './hindernis.js';

export const WERKZEUGE = [auswahl, gang, knoten, formteil, wand, hindernis];
