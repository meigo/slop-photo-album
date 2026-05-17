export interface PaperSize {
  id: string;
  label: string;
  /** CSS @page size, e.g. "297mm 210mm". */
  cssSize: string;
  /** Aspect ratio (width / height) — sizes the on-screen preview to match. */
  aspect: number;
}

/** Three A4-based orientations. Both album and calendar export routes
 *  offer the same options; the on-screen preview fits the (template's)
 *  page aspect into the chosen paper aspect with white-space letterboxing
 *  when they differ. */
export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4-landscape', label: 'A4 landscape (297×210mm)', cssSize: '297mm 210mm', aspect: 297 / 210 },
  { id: 'a4-portrait',  label: 'A4 portrait (210×297mm)',  cssSize: '210mm 297mm', aspect: 210 / 297 },
  { id: 'a4-square',    label: 'A4 square (210×210mm)',    cssSize: '210mm 210mm', aspect: 1 },
];

export function findSize(id: string): PaperSize {
  return PAPER_SIZES.find((s) => s.id === id) ?? PAPER_SIZES[0];
}

/** Sensible defaults per content kind. */
export const DEFAULT_SIZE_ID: Record<'album' | 'calendar', string> = {
  album: 'a4-square',
  calendar: 'a4-landscape',
};
