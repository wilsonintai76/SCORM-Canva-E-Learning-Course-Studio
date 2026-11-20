import React, { useState, useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { useTheme } from '../../context/ThemeContext';
import { GlobalTheme } from '../../types/schema';
import {
  Palette,
  Check,
  Sparkles,
  Image as ImageIcon,
  Type,
  RefreshCw,
  Layers,
  Layout,
  Eye,
  Sliders,
  Shield,
  Award,
  Zap,
  Moon,
  Sun,
  Paintbrush,
  RotateCcw,
} from 'lucide-react';

export interface ThemePresetItem {
  name: string;
  category: 'Modern' | 'Corporate' | 'Creative' | 'Dark';
  theme: GlobalTheme;
}

const PRESET_LOGOS = [
  {
    name: 'Shield Icon',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Tech Server',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Abstract Grid',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80',
  },
];

export const THEME_PRESETS: ThemePresetItem[] = [
  {
    name: 'Modern Tech',
    category: 'Modern',
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#4f46e5',
      accentColor: '#06b6d4',
      backgroundColor: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      headingFontFamily: 'Inter, sans-serif',
      bodyFontFamily: 'Inter, sans-serif',
      logoUrl: '',
      logoPosition: 'top-left',
    },
  },
  {
    name: 'Corporate Slate',
    category: 'Corporate',
    theme: {
      primaryColor: '#0284c7',
      secondaryColor: '#0f766e',
      accentColor: '#38bdf8',
      backgroundColor: '#f8fafc',
      fontFamily: 'Roboto, sans-serif',
      headingFontFamily: 'Roboto, sans-serif',
      bodyFontFamily: 'Roboto, sans-serif',
      logoUrl: '',
      logoPosition: 'top-right',
    },
  },
  {
    name: 'Emerald Health',
    category: 'Creative',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#0d9488',
      accentColor: '#34d399',
      backgroundColor: '#022c22',
      fontFamily: 'Poppins, sans-serif',
      headingFontFamily: 'Poppins, sans-serif',
      bodyFontFamily: 'Inter, sans-serif',
      logoUrl: '',
      logoPosition: 'top-left',
    },
  },
  {
    name: 'Cyberpunk Amber',
    category: 'Dark',
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#ea580c',
      accentColor: '#facc15',
      backgroundColor: '#18181b',
      fontFamily: 'JetBrains Mono, monospace',
      headingFontFamily: 'JetBrains Mono, monospace',
      bodyFontFamily: 'Inter, sans-serif',
      logoUrl: '',
      logoPosition: 'top-left',
    },
  },
  {
    name: 'Warm Editorial',
    category: 'Creative',
    theme: {
      primaryColor: '#e11d48',
      secondaryColor: '#9f1239',
      accentColor: '#fbbf24',
      backgroundColor: '#0f172a',
      fontFamily: 'Playfair Display, serif',
      headingFontFamily: 'Playfair Display, serif',
      bodyFontFamily: 'Inter, sans-serif',
      logoUrl: '',
      logoPosition: 'top-left',
    },
  },
];

export const FONT_PAIRINGS = [
  {
    label: 'Modern Clean (Inter / Inter)',
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  {
    label: 'Corporate Tech (Roboto / Roboto)',
    heading: 'Roboto, sans-serif',
    body: 'Roboto, sans-serif',
  },
  {
    label: 'Friendly Sans (Poppins / Inter)',
    heading: 'Poppins, sans-serif',
    body: 'Inter, sans-serif',
  },
  {
    label: 'Editorial Serif (Playfair / Inter)',
    heading: 'Playfair Display, serif',
    body: 'Inter, sans-serif',
  },
  {
    label: 'Technical Mono (JetBrains Mono / Inter)',
    heading: 'JetBrains Mono, monospace',
    body: 'Inter, sans-serif',
  },
];

export const GlobalThemeEditor: React.FC = () => {
  const { course, applyGlobalTheme } = useCourseStore();
  const { themeMode, themeTokens, setThemeMode, updateThemeTokens, resetTheme } = useTheme();

  const [theme, setTheme] = useState<GlobalTheme>(themeTokens);
  const [applyBackgroundToPages, setApplyBackgroundToPages] = useState(true);
  const [applyLogoToPages, setApplyLogoToPages] = useState(true);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    setTheme(themeTokens);
  }, [themeTokens]);

  const handleResetToDefault = () => {
    resetTheme();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  const handleApply = (themeToApply = theme) => {
    updateThemeTokens(themeToApply, {
      applyBackgroundToPages,
      applyLogoToPages,
    });
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2500);
  };

  const handleSelectPreset = (presetTheme: GlobalTheme) => {
    const updated = {
      ...presetTheme,
      logoUrl: theme.logoUrl || presetTheme.logoUrl,
      logoPosition: theme.logoPosition || presetTheme.logoPosition,
    };
    setTheme(updated);
    updateThemeTokens(updated, {
      applyBackgroundToPages,
      applyLogoToPages,
    });
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2500);
  };

  const handleSelectFontPairing = (heading: string, body: string) => {
    const updated = {
      ...theme,
      fontFamily: heading,
      headingFontFamily: heading,
      bodyFontFamily: body,
    };
    setTheme(updated);
    updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Theme &amp; Design Tokens</span>
          </h4>
          <span className="text-[10px] text-pink-400 bg-pink-950/80 border border-pink-800/80 px-2 py-0.5 rounded-full font-semibold">
            Cascading Tokens
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Centralize brand colors, typography pairings, and logos to format all slides automatically.
        </p>
      </div>

      {/* Visual Mode Selector: Dark / Light / Custom */}
      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
        <label className="text-slate-300 font-bold text-[11px] block">Global Visual Mode</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              themeMode === 'dark'
                ? 'bg-blue-600 text-white shadow border border-blue-400'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              themeMode === 'light'
                ? 'bg-sky-500 text-slate-950 font-bold shadow border border-sky-300'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setThemeMode('custom')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              themeMode === 'custom'
                ? 'bg-pink-600 text-white shadow border border-pink-400'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Custom</span>
          </button>
        </div>
      </div>


      {/* Preset Theme Packs */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-slate-300 font-bold text-[11px]">Curated Theme Packs</label>
          <span className="text-[10px] text-slate-500">1-Click Apply</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((p) => {
            const isMatch =
              theme.primaryColor === p.theme.primaryColor &&
              theme.backgroundColor === p.theme.backgroundColor;
            return (
              <button
                key={p.name}
                onClick={() => handleSelectPreset(p.theme)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isMatch
                    ? 'border-pink-500 bg-pink-950/30 shadow-md shadow-pink-500/20'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="font-semibold text-slate-200 text-[11px] truncate flex items-center justify-between">
                  <span>{p.name}</span>
                  {isMatch && <Check className="w-3 h-3 text-pink-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
                    style={{ background: p.theme.primaryColor }}
                    title={`Primary: ${p.theme.primaryColor}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
                    style={{ background: p.theme.secondaryColor }}
                    title={`Secondary: ${p.theme.secondaryColor}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
                    style={{ background: p.theme.accentColor }}
                    title={`Accent: ${p.theme.accentColor}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
                    style={{ background: p.theme.backgroundColor }}
                    title={`Base: ${p.theme.backgroundColor}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Palette Tokens */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Brand Color Tokens
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Primary */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold mb-1">
              Primary Brand
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => {
                  const updated = { ...theme, primaryColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => {
                  const updated = { ...theme, primaryColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-full bg-transparent font-mono text-[10px] text-slate-200 outline-none uppercase"
              />
            </div>
          </div>

          {/* Secondary */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold mb-1">
              Secondary Brand
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => {
                  const updated = { ...theme, secondaryColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={theme.secondaryColor}
                onChange={(e) => {
                  const updated = { ...theme, secondaryColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-full bg-transparent font-mono text-[10px] text-slate-200 outline-none uppercase"
              />
            </div>
          </div>

          {/* Accent */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold mb-1">
              Accent Highlight
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => {
                  const updated = { ...theme, accentColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={theme.accentColor}
                onChange={(e) => {
                  const updated = { ...theme, accentColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-full bg-transparent font-mono text-[10px] text-slate-200 outline-none uppercase"
              />
            </div>
          </div>

          {/* Canvas Base */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold mb-1">
              Canvas Base
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={theme.backgroundColor}
                onChange={(e) => {
                  const updated = { ...theme, backgroundColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={theme.backgroundColor}
                onChange={(e) => {
                  const updated = { ...theme, backgroundColor: e.target.value };
                  setTheme(updated);
                  updateThemeTokens(updated, { applyBackgroundToPages, applyLogoToPages });
                }}
                className="w-full bg-transparent font-mono text-[10px] text-slate-200 outline-none uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography Font Pairings */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            Font Pairings &amp; Hierarchy
          </label>
        </div>

        {/* Quick Pairing Selector */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">Curated Font Pairings</label>
          <select
            onChange={(e) => {
              const pair = FONT_PAIRINGS[Number(e.target.value)];
              if (pair) handleSelectFontPairing(pair.heading, pair.body);
            }}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 outline-none focus:border-blue-500 cursor-pointer text-xs"
          >
            {FONT_PAIRINGS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Heading Font</label>
            <select
              value={theme.headingFontFamily || theme.fontFamily}
              onChange={(e) =>
                setTheme({ ...theme, headingFontFamily: e.target.value, fontFamily: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-md p-1.5 text-slate-200 outline-none text-[11px]"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              <option value="system-ui, sans-serif">System Native</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Body Font</label>
            <select
              value={theme.bodyFontFamily || theme.fontFamily}
              onChange={(e) => setTheme({ ...theme, bodyFontFamily: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-md p-1.5 text-slate-200 outline-none text-[11px]"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Poppins, sans-serif">Poppins</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              <option value="system-ui, sans-serif">System Native</option>
            </select>
          </div>
        </div>
      </div>

      {/* Brand / Course Logo */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
        <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          Brand / Course Logo
        </label>

        <div className="space-y-1.5">
          <input
            type="text"
            value={theme.logoUrl || ''}
            placeholder="https://.../brand-logo.png"
            onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2 text-slate-200 font-mono text-[11px] outline-none focus:border-blue-500"
          />

          {/* Preset Logo Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500">Presets:</span>
            {PRESET_LOGOS.map((pl, idx) => (
              <button
                key={idx}
                onClick={() => setTheme({ ...theme, logoUrl: pl.url })}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white transition-colors"
              >
                {pl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Position Selector */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-semibold">Header Logo Placement</label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'top-left', label: 'Top Left' },
              { id: 'top-right', label: 'Top Right' },
              { id: 'bottom-right', label: 'Bottom Right' },
            ].map((pos) => (
              <button
                key={pos.id}
                onClick={() => setTheme({ ...theme, logoPosition: pos.id as any })}
                className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors ${
                  theme.logoPosition === pos.id
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cascading Options Checkboxes */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={applyLogoToPages}
            onChange={(e) => setApplyLogoToPages(e.target.checked)}
            className="rounded border-slate-700 text-pink-600 focus:ring-pink-500 bg-slate-900"
          />
          <span className="text-[11px]">Auto-add Brand Logo to all slide headers</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={applyBackgroundToPages}
            onChange={(e) => setApplyBackgroundToPages(e.target.checked)}
            className="rounded border-slate-700 text-pink-600 focus:ring-pink-500 bg-slate-900"
          />
          <span className="text-[11px]">Set Canvas Base Color as slide background</span>
        </label>
      </div>

      {/* Live Token Mockup Swatch */}
      <div className="p-3 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden" style={{ background: theme.backgroundColor }}>
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-700/50 pb-1.5">
          <span className="font-semibold text-slate-300">Live Token Mockup</span>
          <Eye className="w-3.5 h-3.5 text-pink-400" />
        </div>

        <div className="space-y-1">
          <div
            className="text-xs font-bold truncate"
            style={{
              fontFamily: theme.headingFontFamily || theme.fontFamily,
              color: theme.primaryColor,
            }}
          >
            Sample Slide Heading
          </div>
          <p
            className="text-[10px] leading-tight text-slate-300 line-clamp-2"
            style={{ fontFamily: theme.bodyFontFamily || theme.fontFamily }}
          >
            Design tokens cascade typography &amp; color variables across all course components.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            className="px-2.5 py-1 rounded text-[10px] font-bold text-white shadow-sm"
            style={{
              background: theme.primaryColor,
              borderColor: theme.accentColor,
            }}
          >
            Primary Action
          </button>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: theme.secondaryColor,
              color: '#ffffff',
            }}
          >
            Secondary
          </span>
        </div>
      </div>

      {/* Theme Action Buttons */}
      <div className="space-y-2 pt-1">
        {/* Apply Theme Button */}
        <button
          onClick={() => handleApply()}
          className="w-full py-2.5 px-3 bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-600/25 transition-all cursor-pointer"
        >
          {appliedSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Theme Tokens Applied to Course!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Apply Theme Tokens to Course</span>
            </>
          )}
        </button>

        {/* Reset Theme to Default Button */}
        <button
          type="button"
          onClick={handleResetToDefault}
          title="Revert to system-standard aesthetics (Default Dark Slate theme, Inter typography, standard contrast)"
          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
        >
          {resetSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">Reverted to System Defaults!</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Theme to Default</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
