export interface TextStyle {
  fontFamily: string;
  fontSize: number;       // px at review size
  fontWeight: number;     // 100..900
  italic: boolean;
  color: string;          // #rrggbb
  align: 'left' | 'center' | 'right';
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Roboto',
  fontSize: 28,
  fontWeight: 400,
  italic: false,
  color: '#000000',
  align: 'center',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ALIGN_VALUES = new Set(['left', 'center', 'right']);

export function parseStyle(json: string | null): TextStyle | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    if (typeof p.fontFamily !== 'string' || !p.fontFamily) return null;
    if (!Number.isFinite(p.fontSize) || p.fontSize < 4 || p.fontSize > 400) return null;
    if (!Number.isFinite(p.fontWeight) || p.fontWeight < 100 || p.fontWeight > 900) return null;
    if (typeof p.italic !== 'boolean') return null;
    if (typeof p.color !== 'string' || !HEX_RE.test(p.color)) return null;
    if (typeof p.align !== 'string' || !ALIGN_VALUES.has(p.align)) return null;
    return {
      fontFamily: p.fontFamily,
      fontSize: p.fontSize,
      fontWeight: p.fontWeight,
      italic: p.italic,
      color: p.color,
      align: p.align as TextStyle['align'],
    };
  } catch {
    return null;
  }
}

export function serializeStyle(s: TextStyle): string {
  return JSON.stringify({
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    italic: s.italic,
    color: s.color,
    align: s.align,
  });
}

export function cssForStyle(s: TextStyle): string {
  return [
    `font-family: '${s.fontFamily.replace(/'/g, "\\'")}', sans-serif`,
    `font-size: ${s.fontSize}px`,
    `font-weight: ${s.fontWeight}`,
    `font-style: ${s.italic ? 'italic' : 'normal'}`,
    `color: ${s.color}`,
    `text-align: ${s.align}`,
    'line-height: 1.2',
  ].join('; ');
}
