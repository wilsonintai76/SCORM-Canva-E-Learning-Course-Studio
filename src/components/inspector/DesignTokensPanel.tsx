import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useCourseStore } from '../../store/courseStore';
import { GlobalTheme } from '../../types/schema';
import { THEME_PRESETS, FONT_PAIRINGS } from '../sidebar/GlobalThemeEditor';
import { calculateContrastRatio } from '../../utils/accessibilityAuditor';
import {
  Palette,
  Type,
  Maximize,
  Sparkles,
  Check,
  RotateCcw,
  Ruler,
  Eye,
  Sliders,
} from 'lucide-react';

export const DesignTokensPanel: React.FC = () => {
  const { themeTokens, updateThemeTokens, resetTheme } = useTheme();
  const { addPresetGuides, clearAllGuides, updateNode, selectedNode } = useCourseStore();

  const [tokens, setTokens] = useState<GlobalTheme>(themeTokens);
  const [applyColors, setApplyColors] = useState(true);
  const [applyTypography, setApplyTypography] = useState(true);
  const [applySpacing, setApplySpacing] = useState(true);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  useEffect(() => {
    setTokens(themeTokens);
  }, [themeTokens]);

  const typography = tokens.typography || {
    headingSize: 32,
    subheadingSize: 22,
    bodySize: 16,
    lineHeight: 1.4,
  };

  const spacing = tokens.spacing || {
    slideMargin: 40,
    elementGap: 16,
    cardPadding: 16,
    borderRadius: 12,
  };

  const commitTokens = (
    next: GlobalTheme,
    options?: { cascadeBackground?: boolean; cascadeTypo?: boolean; cascadeSpace?: boolean }
  ) => {
    setTokens(next);
    updateThemeTokens(next, {
      applyBackgroundToPages: options?.cascadeBackground ?? applyColors,
      applyLogoToPages: false,
      applyTypographyToPages: options?.cascadeTypo ?? applyTypography,
      applySpacingToPages: options?.cascadeSpace ?? applySpacing,
    });
  };

  const handleColorChange = (key: keyof GlobalTheme, val: string) => {
    const next = { ...tokens, [key]: val };
    commitTokens(next, { cascadeBackground: key === 'backgroundColor' || key === 'textColor' });
  };

  const handleTypographyChange = (key: keyof NonNullable<GlobalTheme['typography']>, val: number) => {
    const next: GlobalTheme = {
      ...tokens,
      typography: {
        ...typography,
        [key]: val,
      },
    };
    commitTokens(next, { cascadeBackground: false, cascadeTypo: applyTypography, cascadeSpace: false });
  };

  const handleSpacingChange = (key: keyof NonNullable<GlobalTheme['spacing']>, val: number) => {
    const next: GlobalTheme = {
      ...tokens,
      spacing: {
        ...spacing,
        [key]: val,
      },
    };
    commitTokens(next, { cascadeBackground: false, cascadeTypo: false, cascadeSpace: applySpacing });
  };

  const handleApplyAllSlides = () => {
    updateThemeTokens(tokens, {
      applyBackgroundToPages: applyColors,
      applyLogoToPages: Boolean(tokens.logoUrl?.trim()),
      applyTypographyToPages: applyTypography,
      applySpacingToPages: applySpacing,
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleSyncMarginGuides = () => {
    clearAllGuides();
    addPresetGuides('safe-margins');
  };

  const handleApplyTokensToSelected = () => {
    if (!selectedNode) return;
    if (selectedNode.type === 'text') {
      const isHeading = selectedNode.fontSize >= 24 || selectedNode.fontWeight === 'bold' || selectedNode.fontWeight === 'black';
      updateNode(selectedNode.id, {
        fontFamily: isHeading ? tokens.headingFontFamily || tokens.fontFamily : tokens.bodyFontFamily || tokens.fontFamily,
        fontSize: isHeading ? typography.headingSize : typography.bodySize,
        lineHeight: typography.lineHeight,
        color: tokens.textColor || selectedNode.color,
        padding: spacing.cardPadding,
        borderRadius: spacing.borderRadius,
      });
    } else if (selectedNode.type === 'shape') {
      updateNode(selectedNode.id, {
        fill: tokens.primaryColor,
        stroke: tokens.accentColor,
        borderRadius: spacing.borderRadius,
      });
    } else if (selectedNode.type === 'image') {
      updateNode(selectedNode.id, {
        borderRadius: spacing.borderRadius,
      });
    } else if (selectedNode.type === 'quiz') {
      updateNode(selectedNode.id, {
        themeColor: tokens.primaryColor,
      });
    }
  };

  const contrastRatio = calculateContrastRatio(
    tokens.textColor || '#f8fafc',
    tokens.backgroundColor || '#0f172a'
  );

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Header */}
      <div className="pb-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-pink-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Design Tokens
          </span>
        </div>
        <span className="text-[10px] font-mono bg-pink-950/70 text-pink-300 border border-pink-700/60 px-2 py-0.5 rounded-full">
          Global System
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-snug">
        Define project-wide color, typography, and spacing variables to enforce visual consistency across every slide.
      </p>

      {/* Quick Theme Presets */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Quick Token Presets
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {THEME_PRESETS.map((preset) => {
            const active =
              tokens.primaryColor === preset.theme.primaryColor &&
              tokens.backgroundColor === preset.theme.backgroundColor;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                onClick={() => {
                  const next: GlobalTheme = {
                    ...preset.theme,
                    surfaceColor: tokens.surfaceColor,
                    textColor: preset.theme.backgroundColor === '#f8fafc' ? '#0f172a' : '#f8fafc',
                    typography,
                    spacing,
                  };
                  commitTokens(next, { cascadeBackground: true, cascadeTypo: applyTypography, cascadeSpace: applySpacing });
                }}
                className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  active
                    ? 'border-pink-500 bg-pink-950/40 ring-1 ring-pink-500/40'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex -space-x-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-900"
                    style={{ background: preset.theme.primaryColor }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-900"
                    style={{ background: preset.theme.backgroundColor }}
                  />
                </div>
                <span className="text-[9px] text-slate-300 truncate w-full text-center">
                  {preset.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. COLOR TOKENS */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Color Tokens</span>
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              contrastRatio >= 4.5
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                : 'bg-amber-950/70 text-amber-300 border-amber-700/60'
            }`}
            title="Text vs Canvas Base contrast ratio"
          >
            {contrastRatio.toFixed(1)}:1 {contrastRatio >= 4.5 ? 'AA' : 'Low'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'primaryColor' as const, label: 'Primary', fallback: '#2563eb' },
            { key: 'secondaryColor' as const, label: 'Secondary', fallback: '#4f46e5' },
            { key: 'accentColor' as const, label: 'Accent', fallback: '#06b6d4' },
            { key: 'backgroundColor' as const, label: 'Canvas Bg', fallback: '#0f172a' },
            { key: 'surfaceColor' as const, label: 'Surface Card', fallback: '#1e293b' },
            { key: 'textColor' as const, label: 'Body Text', fallback: '#f8fafc' },
          ].map((item) => {
            const value = (tokens[item.key] as string) || item.fallback;
            return (
              <div key={item.key}>
                <label className="block text-[10px] text-slate-400 mb-1">{item.label}</label>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-1.5 py-1">
                  <input
                    type="color"
                    value={value.startsWith('#') ? value : item.fallback}
                    onChange={(e) => handleColorChange(item.key, e.target.value)}
                    className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleColorChange(item.key, e.target.value)}
                    className="w-full bg-transparent font-mono text-[10px] text-slate-200 outline-none uppercase"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. TYPOGRAPHY TOKENS */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>Typography Tokens</span>
          </span>
          <span className="text-[10px] font-mono text-sky-300">
            {typography.headingSize}/{typography.bodySize}px
          </span>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Font Pairing Preset</label>
          <select
            value={FONT_PAIRINGS.findIndex(
              (p) =>
                p.heading === (tokens.headingFontFamily || tokens.fontFamily) &&
                p.body === (tokens.bodyFontFamily || tokens.fontFamily)
            )}
            onChange={(e) => {
              const pair = FONT_PAIRINGS[Number(e.target.value)];
              if (pair) {
                commitTokens(
                  {
                    ...tokens,
                    fontFamily: pair.heading,
                    headingFontFamily: pair.heading,
                    bodyFontFamily: pair.body,
                  },
                  { cascadeBackground: false, cascadeTypo: applyTypography, cascadeSpace: false }
                );
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-sky-500"
          >
            <option value={-1}>Custom Font Pairing</option>
            {FONT_PAIRINGS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Heading Size</span>
              <span className="font-mono text-sky-300">{typography.headingSize}px</span>
            </div>
            <input
              type="range"
              min={22}
              max={52}
              step={1}
              value={typography.headingSize}
              onChange={(e) => handleTypographyChange('headingSize', Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Subheading</span>
              <span className="font-mono text-sky-300">{typography.subheadingSize}px</span>
            </div>
            <input
              type="range"
              min={16}
              max={32}
              step={1}
              value={typography.subheadingSize}
              onChange={(e) => handleTypographyChange('subheadingSize', Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Body Size</span>
              <span className="font-mono text-sky-300">{typography.bodySize}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={24}
              step={1}
              value={typography.bodySize}
              onChange={(e) => handleTypographyChange('bodySize', Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Line Height</span>
              <span className="font-mono text-sky-300">{typography.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.1}
              max={2.0}
              step={0.05}
              value={typography.lineHeight}
              onChange={(e) => handleTypographyChange('lineHeight', Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 3. SPACING & RADIUS TOKENS */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spacing &amp; Radius Tokens</span>
          </span>
          <button
            type="button"
            onClick={handleSyncMarginGuides}
            title="Apply safe margin guide lines to current slide"
            className="text-[10px] text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer"
          >
            <Ruler className="w-3 h-3" />
            <span>Guides</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Slide Margin</span>
              <span className="font-mono text-emerald-300">{spacing.slideMargin}px</span>
            </div>
            <input
              type="range"
              min={16}
              max={80}
              step={4}
              value={spacing.slideMargin}
              onChange={(e) => handleSpacingChange('slideMargin', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Element Gap</span>
              <span className="font-mono text-emerald-300">{spacing.elementGap}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={48}
              step={2}
              value={spacing.elementGap}
              onChange={(e) => handleSpacingChange('elementGap', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Card Padding</span>
              <span className="font-mono text-emerald-300">{spacing.cardPadding}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={40}
              step={2}
              value={spacing.cardPadding}
              onChange={(e) => handleSpacingChange('cardPadding', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Border Radius</span>
              <span className="font-mono text-emerald-300">{spacing.borderRadius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              step={2}
              value={spacing.borderRadius}
              onChange={(e) => handleSpacingChange('borderRadius', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Live Token Preview Card */}
      <div
        className="border border-slate-800 space-y-2 transition-all"
        style={{
          backgroundColor: tokens.backgroundColor,
          padding: `${Math.min(20, Math.max(8, Math.round(spacing.cardPadding * 0.75)))}px`,
          borderRadius: `${spacing.borderRadius}px`,
        }}
      >
        <div className="flex items-center justify-between text-[10px] opacity-75" style={{ color: tokens.textColor || '#f8fafc' }}>
          <span className="font-semibold flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Live Token Specimen
          </span>
          <span className="font-mono">
            pad:{spacing.cardPadding} r:{spacing.borderRadius}
          </span>
        </div>
        <div
          className="border border-white/10"
          style={{
            backgroundColor: tokens.surfaceColor || '#1e293b',
            borderRadius: `${Math.max(4, spacing.borderRadius - 2)}px`,
            padding: `${Math.min(14, Math.max(6, Math.round(spacing.cardPadding * 0.65)))}px`,
          }}
        >
          <div
            className="font-bold truncate"
            style={{
              fontFamily: tokens.headingFontFamily || tokens.fontFamily,
              fontSize: `${Math.min(20, Math.max(13, Math.round(typography.headingSize * 0.52)))}px`,
              color: tokens.primaryColor,
              lineHeight: typography.lineHeight,
            }}
          >
            Course Module Heading
          </div>
          <p
            className="mt-1 opacity-90"
            style={{
              fontFamily: tokens.bodyFontFamily || tokens.fontFamily,
              fontSize: `${Math.min(13, Math.max(10, Math.round(typography.bodySize * 0.72)))}px`,
              color: tokens.textColor || '#f8fafc',
              lineHeight: typography.lineHeight,
            }}
          >
            Body copy follows global font family, line height ({typography.lineHeight}), and spacing tokens.
          </p>
        </div>
      </div>

      {/* Cascade Options */}
      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
        <span className="text-[10px] font-bold uppercase text-slate-400 block">
          Cascade Scope on Apply
        </span>
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={applyColors}
            onChange={(e) => setApplyColors(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 accent-pink-500"
          />
          <span>Sync slide backgrounds &amp; text contrast</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={applyTypography}
            onChange={(e) => setApplyTypography(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 accent-sky-500"
          />
          <span>Cascade font sizes &amp; line-height scale</span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={applySpacing}
            onChange={(e) => setApplySpacing(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 accent-emerald-500"
          />
          <span>Apply card padding &amp; border-radius tokens</span>
        </label>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleApplyAllSlides}
          className="w-full py-2 px-3 bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
        >
          {savedFeedback ? (
            <>
              <Check className="w-4 h-4" />
              <span>Tokens Applied Across All Slides!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Apply Tokens to All Slides</span>
            </>
          )}
        </button>

        {selectedNode && (
          <button
            type="button"
            onClick={handleApplyTokensToSelected}
            className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 hover:text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-[11px]"
          >
            <span>Sync Selected Element to Tokens</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            resetTheme();
            setResetFeedback(true);
            setTimeout(() => setResetFeedback(false), 2000);
          }}
          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-[11px]"
        >
          {resetFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Reset to System Tokens</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Tokens to Default</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
