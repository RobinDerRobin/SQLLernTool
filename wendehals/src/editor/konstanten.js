// Alle Zahlen, Kürzel und Farben des Editors an einer Stelle (Brief Abschnitt 3). Wer etwas am Editor ändern will, fängt hier an.
import { SCREEN_W, SCREEN_H } from '../core/math.js';
import { FLOOR, FLOOR2, WALL, GRID } from '../proto/fenster-draw.js';

export { SCREEN_W, SCREEN_H, FLOOR, FLOOR2, WALL, GRID };

export const FORMAT = 1; // Version des Dateiformats (levels/gebiete/*.json)
export const SPEED = 70; // Flugtempo des Prototyps in E/s (Fahrt-Schieber, Sekunden-Anzeige)
export const RASTER = 20; // Einrasten beim Ziehen (E)
export const KNOTENRASTER = 100; // Einrasten für Knoten (E)
export const DREHZONE = 160; // Drehzone vor einer Kreuzung (E), Prüfregel M3
export const MIN_QUERWEG = 60; // kleinster freier Querweg im Gang (E), Prüfregel M2
export const WINKEL_SCHRITT = 45; // Winkel nur in 45°-Schritten
export const GANG_BREITE = 200; // Breite eines neu gezogenen Gangs (E)
export const RAUM_W = 520; // Maße eines neuen Raums / Bosskampfs (E)
export const RAUM_H = 400;
export const MIN_RAUM = 100; // kleinste Raumseite (E)
export const TEIL_STANDARD = {
  // Maße eines neu gesetzten Teils (E), wenn nur geklickt statt gezogen wird
  formteil: { laenge: 260, breite: 120 },
  wand: { laenge: 240, breite: 60 },
  hindernis: { laenge: 60, breite: 60 },
};
export const MIN_TEIL = RASTER; // kleinste Länge/Breite eines Teils (E)
export const KOPIE_VERSATZ = 40; // Versatz einer Kopie, wenn keine Zielstelle bekannt ist (E)
export const MIN_GANG_LAENGE = RASTER; // kürzere Gänge entstehen beim Ziehen nicht
export const FANG_PX = 12; // Fangradius für Knoten und Gänge beim Ziehen/Setzen (Bildschirmpixel, wird mit dem Zoom in E umgerechnet)
export const MAX_KOORD = 20000; // größte erlaubte Koordinate/Maßzahl (E)
export const VERLAUF_MAX = 200; // Schritte, die Rückgängig zurückgehen kann

/** Zoom stufenlos, gemessen in „Bildschirmen in der Breite des Plans“. Normalansicht ≈ 2,2 Bildschirme (Brief Abschnitt 1). */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 160;
export const ZOOM_START = 2.2;
export const ZOOM_RAD_FAKTOR = 1.15; // eine Mausrad-Raste (deltaY 100) ändert den Maßstab um diesen Faktor (A2: ca. 15 %)
export const ZOOM_RAD_MAX = 400; // größte Wirkung eines einzelnen Radereignisses (deltaY), schützt vor Sprüngen
export const ZOOM_TASTE_FAKTOR = 1.25; // Tasten + und − (und die Knöpfe)
export const ZOOM_FESTWERTE = { eins: 1, normal: 2.2 }; // Tasten 1 und 2
export const EINPASS_RAND = 1.05; // „Alles“ lässt rundum 5 % Rand

/** Tastenkürzel (KeyboardEvent.code). */
export const KUERZEL = {
  drehenLinks: 'KeyQ',
  drehenRechts: 'KeyE',
  norden: 'Digit0',
  wieImSpiel: 'KeyF',
  zoomPlus: ['Equal', 'NumpadAdd'],
  zoomMinus: ['Minus', 'NumpadSubtract'],
  zoomEins: 'Digit1', // 1 Bildschirm (so groß wie im Spiel)
  zoomNormal: 'Digit2', // Normalansicht 2,2 Bildschirme
  beschriftung: 'KeyL',
  alles: 'Home',
  werkzeug: { auswahl: 'KeyV', gang: 'KeyG', knoten: 'KeyK', formteil: 'KeyB', wand: 'KeyW', hindernis: 'KeyH', gegner: 'KeyX', bereich: 'KeyA' },
  look: 'KeyJ', // Look umschalten: Prototyp-Farben ↔ Tileset des Gebiets
  welt: 'KeyT', // zwischen Gebiet- und Welt-Ansicht umschalten
  teilDrehen: 'KeyR', // ohne Umschalt 45° rechtsherum, mit Umschalt linksherum
  kopieren: 'KeyC', // mit Strg/Cmd
  einfuegen: 'KeyV', // mit Strg/Cmd
  duplizieren: 'KeyD', // mit Strg/Cmd
  loeschen: ['Delete'], // nur Entf (Backspace löscht nicht mehr, A5)
  rueckgaengig: 'KeyZ', // mit Strg/Cmd; mit Umschalt = Wiederholen
  wiederholen: 'KeyY', // mit Strg/Cmd
  speichern: 'KeyS', // mit Strg/Cmd
  oeffnen: 'KeyO', // mit Strg/Cmd
  spielen: 'KeyP', // Spielen ab hier
  bezeichnung: 'KeyN', // Bezeichnung kopieren
  fahrtStart: 'Space',
  fahrtVor: 'BracketRight',
  fahrtZurueck: 'BracketLeft',
  links: 'ArrowLeft',
  rechts: 'ArrowRight',
  hoch: 'ArrowUp',
  runter: 'ArrowDown',
};
export const PFEIL_SCHRITT_PX = 60; // Verschieben mit Pfeiltasten (Bildschirmpixel)
export const KLICK_TOLERANZ_PX = 8; // Bewegung unter dieser Strecke gilt als Klick, erst darüber beginnt ein Ziehen (A5)
/** Maustasten (MouseEvent.button): links wählt und zieht, rechts setzt das aktuelle Element, Mitte (und Shift+links) verschiebt den Plan (A1). */
export const MAUS = { waehlen: 0, verschieben: 1, setzen: 2 };

/** Farben der Bedienelemente im Plan (das Spielbild selbst nutzt FLOOR/FLOOR2/WALL des Prototyps). */
export const FARBEN = {
  rahmen: '#ffd24a',
  rahmenAussen: 'rgba(0,0,0,0.38)',
  auswahl: '#4ad0ff',
  vorschau: '#8dffb0',
  vorschauFalsch: '#ff7a6a',
  knoten: { speicher: '#5be07a', kreuzung: '#e8e8f0', raum: '#c89bff', ende: '#9aa0aa', boss: '#ff6b5e' },
  notiz: '#fff28a',
  platzhalter: '#ff9a3c',
  hindernis: '#d9822b', // Farbe der Hindernisse (Look „Prototyp“, wie im Fenster-Prototyp)
  massstab: '#ffffff',
  pruefMuss: '#ff3b2e', // Marken des Prüfers im Plan
  pruefSoll: '#ffc830',
  bereich: '#7fb3ff', // Rahmen des Gebiets-Bereichs im Plan
  uebergang: '#ff8ad8', // Übergang zwischen Gebieten
};
export const GEGNER_RADIUS = 14; // Trefferradius eines Gegner-Platzhalters (E)
export const PALETTE_PX = 56; // Kantenlänge eines Palettenbilds (Bildschirmpixel)
export const KNOTEN_RADIUS_PX = 7; // Knotenmarke (Bildschirmpixel, unabhängig vom Zoom)

// Prüfer (Stufe 4): Abtastung der Regeln in regeln.js
export const PRUEF_SCHRITT = 20; // Abstand der Messstellen entlang eines Gangs (E)
export const PRUEF_QUER = 10; // Abstand der Messpunkte quer zum Gang (E)
export const PRUEF_RAND = 2; // Toleranz am Rand des Bodens (E): Ecken dürfen so weit danebenliegen (Rundung, Raster)
export const MIN_GANG_SOLL = SCREEN_W; // Regel S1: kürzere Gänge lassen die Drehzonen überlappen (E)

// Gebiete und Übergänge (Stufe 5)
export const BEREICH_RASTER = 100; // Bereiche rasten auf diese Größe ein (E)
export const MIN_BEREICH_W = SCREEN_W; // kleinster Bereich: ein Bildschirm (E)
export const MIN_BEREICH_H = SCREEN_H;
export const BEREICH_RAND = 200; // Rand um den Inhalt bei „An Inhalt anpassen“ (E)
export const WELT_LUECKE = 400; // Abstand beim automatischen Anordnen von Gebieten ohne Lage (E)
export const LAGE_RASTER = 100; // Gebiete rasten in der Welt auf diese Schrittweite ein (E)
