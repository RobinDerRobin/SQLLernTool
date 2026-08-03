export interface ThemeDefinition {
  id: string;
  name: string;
  /** Four representative colors shown as the picker's preview square. */
  swatch: [string, string, string, string];
}

/**
 * Ported verbatim from the prototype's THEMES list. `default` is the base
 * palette defined in `:root` — every other id must have a matching
 * `.sql-app[data-theme="<id>"]` block in themes.css (asserted by a test).
 */
export const THEMES: ThemeDefinition[] = [
  { id: 'default', name: 'Rost & Gold (Standard)', swatch: ['#171310', '#E8541F', '#F2B705', '#3A1B0F'] },
  { id: 'midnight-neon', name: 'Midnight Neon', swatch: ['#0A0E14', '#00E5C7', '#FF3D8A', '#0E2A2A'] },
  { id: 'forest-terminal', name: 'Forest Terminal', swatch: ['#10160F', '#9ADC3C', '#E8A33D', '#1B2B14'] },
  { id: 'ocean-depth', name: 'Ocean Depth', swatch: ['#081019', '#23C4C4', '#FF7A5C', '#0B2436'] },
  { id: 'mono-ink', name: 'Mono Ink', swatch: ['#121212', '#E8382A', '#C7C7C7', '#0A0A0A'] },
  { id: 'royal-purple', name: 'Royal Purple', swatch: ['#140A1C', '#9B5DE5', '#F2B705', '#2A1240'] },
  { id: 'solar-flare', name: 'Solar Flare (hell)', swatch: ['#FBF3E7', '#D9581C', '#1B3A5C', '#2A1A0D'] },
  { id: 'retro-amber', name: 'Retro Amber CRT', swatch: ['#0D0B08', '#FFB000', '#FF8800', '#120F0C'] },
  { id: 'bubblegum-pop', name: 'Bubblegum Pop', swatch: ['#16111D', '#FF5FA8', '#4DEAE0', '#34174A'] },
  { id: 'slate-copper', name: 'Slate & Copper', swatch: ['#1A1D21', '#C97A4A', '#5C8AA8', '#2E2622'] },
  { id: 'paper-ink', name: 'Paper & Ink (hell)', swatch: ['#F5F1E8', '#B3261E', '#1C2B4A', '#1C1A16'] },
];

export const DEFAULT_THEME_ID = 'default';

/** The default palette lives in `:root`, so it is expressed as the *absence* of a data-theme attribute. */
export function applyThemeAttribute(appRoot: HTMLElement, themeId: string): void {
  if (themeId === DEFAULT_THEME_ID) {
    appRoot.removeAttribute('data-theme');
  } else {
    appRoot.setAttribute('data-theme', themeId);
  }
}
