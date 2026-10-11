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

/** Zoomstufen als „Bildschirme in der Breite des Plans“. Normalansicht ≈ 2,2 Bildschirme (Brief Abschnitt 1). */
export const ZOOM_BILDSCHIRME = [0.5, 1, 2.2, 4, 8, 16, 32];
export const ZOOM_START = 2;

/** Tastenkürzel (KeyboardEvent.code). */
export const KUERZEL = {
  drehenLinks: 'KeyQ',
  drehenRechts: 'KeyE',
  norden: 'Digit0',
  wieImSpiel: 'KeyF',
  zoomPlus: ['Equal', 'NumpadAdd'],
  zoomMinus: ['Minus', 'NumpadSubtract'],
  beschriftung: 'KeyL',
  alles: 'Home',
  fahrtStart: 'Space',
  fahrtVor: 'BracketRight',
  fahrtZurueck: 'BracketLeft',
  links: 'ArrowLeft',
  rechts: 'ArrowRight',
  hoch: 'ArrowUp',
  runter: 'ArrowDown',
};
export const PFEIL_SCHRITT_PX = 60; // Verschieben mit Pfeiltasten (Bildschirmpixel)
export const KLICK_TOLERANZ_PX = 5; // Bewegung unter dieser Strecke gilt als Klick, darüber als Verschieben

/** Farben der Bedienelemente im Plan (das Spielbild selbst nutzt FLOOR/FLOOR2/WALL des Prototyps). */
export const FARBEN = {
  rahmen: '#ffd24a',
  rahmenAussen: 'rgba(0,0,0,0.38)',
  auswahl: '#4ad0ff',
  knoten: { speicher: '#5be07a', kreuzung: '#e8e8f0', raum: '#c89bff', ende: '#9aa0aa', boss: '#ff6b5e' },
  notiz: '#fff28a',
  platzhalter: '#ff9a3c',
  massstab: '#ffffff',
};
export const KNOTEN_RADIUS_PX = 7; // Knotenmarke (Bildschirmpixel, unabhängig vom Zoom)
