import { Check, Palette, RotateCcw, X } from 'lucide-react';
import React from 'react';
import type { ThemeConfig } from '../../shared/types';
import { ACCENT_SWATCHES, isDarkHex, shiftHex, THEME_PRESETS } from '../lib/theme';

interface ThemeCustomizerModalProps {
  theme: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
  onSave: (next: ThemeConfig) => void;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  theme,
  onChange,
  onSave,
  onClose,
}) => {
  const updateBackground = (bg: string) => {
    const dark = isDarkHex(bg);
    const next: ThemeConfig = {
      ...theme,
      mode: dark ? 'dark' : 'light',
      backgroundColor: bg,
      surfaceColor: dark ? shiftHex(bg, 12) : '#ffffff',
    };
    onChange(next);
  };

  const updateSurface = (surface: string) => {
    onChange({
      ...theme,
      surfaceColor: surface,
    });
  };

  const updateAccent = (accent: string) => {
    onChange({
      ...theme,
      accentColor: accent,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-xl my-auto"
        style={{
          backgroundColor: 'var(--oc-surface)',
          color: 'var(--oc-text)',
          border: '1px solid var(--oc-border)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5" style={{ color: 'var(--oc-accent)' }} />
            <div>
              <h2 className="font-display text-xl font-bold">Customize Background & Colors</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--oc-muted)' }}>
                Personalize your Open Circle canvas, cards, and accent color live.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appearance customizer"
            className="p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
            style={{ color: 'var(--oc-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* Curated Presets */}
          <div>
            <div className="text-xs font-semibold mb-2.5">Theme Presets</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const active =
                  theme.backgroundColor.toLowerCase() === preset.theme.backgroundColor.toLowerCase() &&
                  theme.accentColor.toLowerCase() === preset.theme.accentColor.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChange(preset.theme)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-semibold transition-all min-h-[44px]"
                    style={{
                      backgroundColor: preset.theme.backgroundColor,
                      color: isDarkHex(preset.theme.backgroundColor) ? '#f8fafc' : '#0f172a',
                      border: active
                        ? `2px solid ${preset.theme.accentColor}`
                        : '1px solid var(--oc-border)',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: preset.theme.accentColor, color: '#fff' }}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Background & Surface Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="p-3.5 rounded-xl"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <label className="block text-xs font-semibold mb-2">App Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => updateBackground(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono-num text-xs uppercase">{theme.backgroundColor}</span>
              </div>
            </div>

            <div
              className="p-3.5 rounded-xl"
              style={{
                backgroundColor: 'var(--oc-surface-alt)',
                border: '1px solid var(--oc-border)',
              }}
            >
              <label className="block text-xs font-semibold mb-2">Card Surface Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.surfaceColor}
                  onChange={(e) => updateSurface(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono-num text-xs uppercase">{theme.surfaceColor}</span>
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <div className="text-xs font-semibold mb-2.5">Button & Highlight Color</div>
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_SWATCHES.map((swatch) => {
                const active = theme.accentColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => updateAccent(swatch.hex)}
                    aria-label={`Select ${swatch.label} accent`}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{
                      backgroundColor: swatch.hex,
                      color: '#ffffff',
                      outline: active ? '2px solid var(--oc-text)' : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    {active && <Check className="w-4 h-4" />}
                  </button>
                );
              })}

              <label
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer min-h-[38px]"
                style={{
                  backgroundColor: 'var(--oc-surface-alt)',
                  border: '1px solid var(--oc-border)',
                }}
              >
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => updateAccent(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span>Custom</span>
              </label>
            </div>
          </div>

          {/* Background Texture Pattern */}
          <div>
            <div className="text-xs font-semibold mb-2.5">Canvas Background Texture</div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'none', label: 'Clean' },
                  { id: 'warm-glow', label: 'Ambient' },
                  { id: 'dots', label: 'Dots' },
                  { id: 'grid', label: 'Grid' },
                ] as const
              ).map((pat) => {
                const active = theme.pattern === pat.id;
                return (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => onChange({ ...theme, pattern: pat.id })}
                    className="py-2 px-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors"
                    style={
                      active
                        ? { backgroundColor: 'var(--oc-accent)', color: 'var(--oc-accent-fg)' }
                        : {
                            backgroundColor: 'var(--oc-surface-alt)',
                            color: 'var(--oc-text)',
                            border: '1px solid var(--oc-border)',
                          }
                    }
                  >
                    {pat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid var(--oc-border)' }}>
          <button
            type="button"
            onClick={() => onChange(THEME_PRESETS[0].theme)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px]"
            style={{
              backgroundColor: 'var(--oc-surface-alt)',
              color: 'var(--oc-text)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => onSave(theme)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold min-h-[44px]"
            style={{
              backgroundColor: 'var(--oc-accent)',
              color: 'var(--oc-accent-fg)',
            }}
          >
            Save Appearance
          </button>
        </div>
      </div>
    </div>
  );
};
