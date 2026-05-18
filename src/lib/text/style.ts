export interface TextStyle {
  fontFamily: string;
  /** Font size in "px-at-1000px-page-width". Rendered via cqi so the
   *  actual size scales with the page's current rendered width. */
  fontSize: number;
  fontWeight: number;     // 100..900
  italic: boolean;
  color: string;          // #rrggbb
  align: 'left' | 'center' | 'right';
  lineHeight: number;     // 0.8..3
  /** Solid background fill behind the text. null = transparent. */
  backgroundColor: string | null;
  /** Padding (px) between the bg fill edge and the text. Ignored when
   *  backgroundColor is null. */
  backgroundPadding: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Roboto',
  fontSize: 28,
  fontWeight: 400,
  italic: false,
  color: '#000000',
  align: 'center',
  lineHeight: 1.2,
  backgroundColor: null,
  backgroundPadding: 0,
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
    // lineHeight is from Phase 4b — accept legacy rows without it.
    const lineHeight = Number.isFinite(p.lineHeight) && p.lineHeight >= 0.8 && p.lineHeight <= 3
      ? p.lineHeight
      : DEFAULT_TEXT_STYLE.lineHeight;
    // backgroundColor + backgroundPadding are Phase 4d — both optional.
    const backgroundColor = typeof p.backgroundColor === 'string' && HEX_RE.test(p.backgroundColor)
      ? p.backgroundColor
      : null;
    const backgroundPadding = Number.isFinite(p.backgroundPadding) && p.backgroundPadding >= 0 && p.backgroundPadding <= 60
      ? p.backgroundPadding
      : 0;
    return {
      fontFamily: p.fontFamily,
      fontSize: p.fontSize,
      fontWeight: p.fontWeight,
      italic: p.italic,
      color: p.color,
      align: p.align as TextStyle['align'],
      lineHeight,
      backgroundColor,
      backgroundPadding,
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
    backgroundColor: s.backgroundColor,
    backgroundPadding: s.backgroundPadding,
  });
}

export function cssForStyle(s: TextStyle): string {
  // fontSize is stored as px-at-1000px-page-width. cqi (container query
  // inline) makes the actual rendered size scale with the page: 1cqi =
  // 1% of the PageView's width, so fontSize/10 cqi reproduces the
  // original px size on a 1000px page and shrinks/grows proportionally
  // on smaller/larger previews (compact export grid, mobile widths).
  const parts = [
    `font-family: '${s.fontFamily.replace(/'/g, "\\'")}', sans-serif`,
    `font-size: ${s.fontSize / 10}cqi`,
    `font-weight: ${s.fontWeight}`,
    `font-style: ${s.italic ? 'italic' : 'normal'}`,
    `color: ${s.color}`,
    `text-align: ${s.align}`,
    `line-height: ${s.lineHeight}`,
    'white-space: pre-wrap',
  ];
  if (s.backgroundColor !== null) {
    parts.push(`background-color: ${s.backgroundColor}`);
    parts.push(`padding: ${s.backgroundPadding}px`);
    // padding shouldn't push the box past its max-width
    parts.push('box-sizing: border-box');
  }
  return parts.join('; ');
}
