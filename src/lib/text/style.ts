export interface TextStyle {
  fontFamily: string;
  fontSize: number;       // px at review size
  fontWeight: number;     // 100..900
  italic: boolean;
  color: string;          // #rrggbb
  align: 'left' | 'center' | 'right';
  lineHeight: number;     // 0.8..3
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Roboto',
  fontSize: 28,
  fontWeight: 400,
  italic: false,
  color: '#000000',
  align: 'center',
  lineHeight: 1.2,
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
    // lineHeight is new in the schema — accept missing values from older
    // stored styles and fall back to the default.
    const lineHeight = Number.isFinite(p.lineHeight) && p.lineHeight >= 0.8 && p.lineHeight <= 3
      ? p.lineHeight
      : DEFAULT_TEXT_STYLE.lineHeight;
    return {
      fontFamily: p.fontFamily,
      fontSize: p.fontSize,
      fontWeight: p.fontWeight,
      italic: p.italic,
      color: p.color,
      align: p.align as TextStyle['align'],
      lineHeight,
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
    lineHeight: s.lineHeight,
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
    `line-height: ${s.lineHeight}`,
    'white-space: pre-wrap',
  ].join('; ');
}
