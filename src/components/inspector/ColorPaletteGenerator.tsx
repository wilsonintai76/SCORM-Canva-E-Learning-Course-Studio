import React, { useState } from 'react';
import { generateColorHarmonies, calculateContrastRatio } from '../../utils/colorPaletteGenerator';
import { Palette, Sparkles, Copy, Check } from 'lucide-react';

interface ColorPaletteGeneratorProps {
  baseColor: string;
  onApplyColor: (color: string, target?: 'fill' | 'color' | 'border') => void;
  label?: string;
}

export const ColorPaletteGenerator: React.FC<ColorPaletteGeneratorProps> = ({
  baseColor,
  onApplyColor,
  label = 'Color Palette Generator',
}) => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Generate harmonized color palettes from the base color
  const harmonies = generateColorHarmonies(baseColor || '#3b82f6');

  const handleCopy = (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-3">
      {/* Header with Base Color preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <div
            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm"
            style={{ backgroundColor: baseColor }}
          />
          <span>{baseColor}</span>
        </div>
      </div>

      {/* Palette Sets */}
      <div className="space-y-2.5 text-[11px]">
        {/* 1. Complementary */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Complementary (High Contrast)
          </span>
          <div className="flex gap-1.5">
            {harmonies.complementary.map((color, i) => (
              <button
                key={i}
                onClick={() => onApplyColor(color)}
                title={`Click to apply ${color}`}
                className="flex-1 h-6 rounded border border-slate-700/80 hover:scale-105 transition-transform relative group"
                style={{ backgroundColor: color }}
              >
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-mono rounded">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Analogous */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Analogous (Harmonious)
          </span>
          <div className="flex gap-1.5">
            {harmonies.analogous.map((color, i) => (
              <button
                key={i}
                onClick={() => onApplyColor(color)}
                title={`Click to apply ${color}`}
                className="flex-1 h-6 rounded border border-slate-700/80 hover:scale-105 transition-transform relative group"
                style={{ backgroundColor: color }}
              >
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-mono rounded">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Monochromatic Tones */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Monochromatic Shades
          </span>
          <div className="flex gap-1.5">
            {harmonies.monochromatic.map((color, i) => (
              <button
                key={i}
                onClick={() => onApplyColor(color)}
                title={`Click to apply ${color}`}
                className="flex-1 h-6 rounded border border-slate-700/80 hover:scale-105 transition-transform relative group"
                style={{ backgroundColor: color }}
              >
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-mono rounded">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Triadic Accents */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Triadic Palette
          </span>
          <div className="flex gap-1.5">
            {harmonies.triadic.map((color, i) => (
              <button
                key={i}
                onClick={() => onApplyColor(color)}
                title={`Click to apply ${color}`}
                className="flex-1 h-6 rounded border border-slate-700/80 hover:scale-105 transition-transform relative group"
                style={{ backgroundColor: color }}
              >
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-mono rounded">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
