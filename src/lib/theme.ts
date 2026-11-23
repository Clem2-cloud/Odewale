import type { ThemeConfig } from '../../shared/types';

export interface ThemePreset {
  id: string;
  label: string;
  theme: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'daylight-chalk',
    label: 'Daylight Chalk',
    theme: {
      mode: 'light',
      backgroundColor: '#f8f9fa',
      surfaceColor: '#ffffff',
      accentColor: '#0f766e',
      pattern: 'none',
    },
  },
  {
    id: 'warm-paper',
    label: 'Warm Paper',
    theme: {
      mode: 'light',
      backgroundColor: '#faf7f2',
      surfaceColor: '#ffffff',
      accentColor: '#c2410c',
      pattern: 'warm-glow',
    },
  },
  {
    id: 'soft-sage',
    label: 'Soft Sage',
    theme: {
      mode: 'light',
      backgroundColor: '#f1f6f3',
      surfaceColor: '#ffffff',
      accentColor: '#047857',
      pattern: 'dots',
    },
  },
  {
    id: 'cool-mist',
    label: 'Cool Mist',
    theme: {
      mode: 'light',
      backgroundColor: '#eef2f7',
      surfaceColor: '#ffffff',
      accentColor: '#2563eb',
      pattern: 'grid',
    },
  },
  {
    id: 'midnight-slate',
    label: 'Midnight Slate',
    theme: {
      mode: 'dark',
      backgroundColor: '#0b1120',
      surfaceColor: '#131c31',
      accentColor: '#14b8a6',
      pattern: 'warm-glow',
    },
  },
  {
    id: 'deep-obsidian',
    label: 'Deep Obsidian',
    theme: {
      mode: 'dark',
      backgroundColor: '#09090b',
      surfaceColor: '#141418',
      accentColor: '#3b82f6',
      pattern: 'none',
    },
  },
];

export const ACCENT_SWATCHES = [
  { label: 'Teal', hex: '#0f766e' },
  { label: 'Cobalt', hex: '#2563eb' },
  { label: 'Emerald', hex: '#047857' },
  { label: 'Terracotta', hex: '#c2410c' },
  { label: 'Rose', hex: '#be123c' },
  { label: 'Indigo', hex: '#4338ca' },
];

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  }
  return [15, 118, 110];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isDarkHex(hex: string): boolean {
  return getRelativeLuminance(hex) < 0.35;
}

export function getContrastForeground(hex: string): string {
  return getRelativeLuminance(hex) > 0.42 ? '#0f172a' : '#ffffff';
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function shiftHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const nr = clamp(r + amount);
  const ng = clamp(g + amount);
  const nb = clamp(b + amount);
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function applyThemeToDocument(theme: ThemeConfig) {
  const root = document.documentElement;
  const darkBg = isDarkHex(theme.backgroundColor) || theme.mode === 'dark';

  if (darkBg) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  const bg = theme.backgroundColor || (darkBg ? '#0b1120' : '#f8f9fa');
  const surface =
    theme.surfaceColor || (darkBg ? shiftHex(bg, 12) : '#ffffff');
  const surfaceAlt = darkBg ? shiftHex(surface, 10) : shiftHex(bg, -8);
  const text = isDarkHex(surface) ? '#f8fafc' : '#0f172a';
  const muted = isDarkHex(surface) ? '#94a3b8' : '#475569';
  const border = isDarkHex(surface) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
  const accent = theme.accentColor || '#0f766e';
  const accentFg = getContrastForeground(accent);
  const accentSoft = hexToRgba(accent, darkBg ? 0.18 : 0.1);

  root.style.setProperty('--oc-bg', bg);
  root.style.setProperty('--oc-surface', surface);
  root.style.setProperty('--oc-surface-alt', surfaceAlt);
  root.style.setProperty('--oc-text', text);
  root.style.setProperty('--oc-muted', muted);
  root.style.setProperty('--oc-border', border);
  root.style.setProperty('--oc-accent', accent);
  root.style.setProperty('--oc-accent-fg', accentFg);
  root.style.setProperty('--oc-accent-soft', accentSoft);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', accent);
  }
}

export function loadSavedTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem('oc_theme');
    if (raw) return JSON.parse(raw) as ThemeConfig;
  } catch {
    // ignore
  }
  return THEME_PRESETS[0].theme;
}

export function saveLocalTheme(theme: ThemeConfig) {
  try {
    localStorage.setItem('oc_theme', JSON.stringify(theme));
  } catch {
    // ignore
  }
}
