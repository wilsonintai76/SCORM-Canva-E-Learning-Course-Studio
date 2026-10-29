/**
 * Color Palette Generator & Color Harmony Utilities
 */

export interface ColorHarmony {
  complementary: string[];
  analogous: string[];
  triadic: string[];
  monochromatic: string[];
  accessibleAccents: string[];
}

// Convert hex string (#ffffff or #fff) to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  if (cleanHex.length === 6 || cleanHex.length === 8) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL to Hex
export function hslToHex(h: number, s: number, l: number): string {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Generate rich harmonized color palettes from a base color
export function generateColorHarmonies(baseHex: string): ColorHarmony {
  const rgb = hexToRgb(baseHex) || { r: 37, g: 99, b: 235 }; // fallback blue
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // 1. Complementary (180 deg)
  const complementary = [
    hslToHex(h + 180, s, l),
    hslToHex(h + 180, Math.min(100, s + 15), Math.min(85, l + 15)),
    hslToHex(h + 180, Math.max(20, s - 20), Math.max(20, l - 20)),
  ];

  // 2. Analogous (+/- 30 deg)
  const analogous = [
    hslToHex(h - 35, s, l),
    baseHex.startsWith('#') ? baseHex : `#${baseHex}`,
    hslToHex(h + 35, s, l),
    hslToHex(h + 65, Math.min(100, s + 10), l),
  ];

  // 3. Triadic (120 deg & 240 deg)
  const triadic = [
    baseHex.startsWith('#') ? baseHex : `#${baseHex}`,
    hslToHex(h + 120, s, l),
    hslToHex(h + 240, s, l),
  ];

  // 4. Monochromatic (shades and tints)
  const monochromatic = [
    hslToHex(h, s, Math.max(15, l - 35)),
    hslToHex(h, s, Math.max(25, l - 18)),
    baseHex.startsWith('#') ? baseHex : `#${baseHex}`,
    hslToHex(h, Math.max(20, s - 10), Math.min(80, l + 18)),
    hslToHex(h, Math.max(10, s - 20), Math.min(92, l + 32)),
  ];

  // 5. Accessible Accents (tested against light/dark background)
  const accessibleAccents = [
    l > 50 ? '#0f172a' : '#f8fafc',
    hslToHex(h, 90, l > 50 ? 25 : 75),
    hslToHex((h + 180) % 360, 95, l > 50 ? 22 : 78),
    '#38bdf8',
    '#34d399',
    '#fbbf24',
    '#f43f5e',
  ];

  return {
    complementary,
    analogous,
    triadic,
    monochromatic,
    accessibleAccents,
  };
}
