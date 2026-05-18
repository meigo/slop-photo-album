/**
 * Layout template definitions. Each template specifies:
 * - id: short string used as page.template_id
 * - slot_count: how many photos it places
 * - slots: array of {x, y, w, h} in unit-square coordinates (0..1)
 * - aspect: page aspect ratio
 * - label: human-readable for the template-swap dropdown
 *
 * Phase 3c expands from 4 album templates to 10. cal-month unchanged.
 */

export interface SlotLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Template {
  id: string;
  slot_count: number;
  slots: SlotLayout[];
  aspect: 'square' | 'landscape';
  label: string;
  /** When present, the page renderer draws a calendar grid in this
   *  rectangle. Used by calendar templates. */
  calendarGrid?: SlotLayout;
}

export const TEMPLATES: Record<string, Template> = {
  'hero-1': {
    id: 'hero-1',
    slot_count: 1,
    slots: [{ x: 0, y: 0, w: 1, h: 1 }],
    aspect: 'square',
    label: '1 photo (full)',
  },
  'pair-h': {
    id: 'pair-h',
    slot_count: 2,
    slots: [
      { x: 0,   y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    aspect: 'square',
    label: '2 photos (side by side)',
  },
  'pair-v': {
    id: 'pair-v',
    slot_count: 2,
    slots: [
      { x: 0, y: 0,   w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
    aspect: 'square',
    label: '2 photos (stacked)',
  },
  'pair-asym-h': {
    id: 'pair-asym-h',
    slot_count: 2,
    slots: [
      { x: 0,    y: 0, w: 0.66, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 1 },
    ],
    aspect: 'square',
    label: '2 photos (hero left + small right)',
  },
  'pair-asym-h-r': {
    id: 'pair-asym-h-r',
    slot_count: 2,
    slots: [
      { x: 0,    y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.66, h: 1 },
    ],
    aspect: 'square',
    label: '2 photos (small left + hero right)',
  },
  'trio-asym': {
    id: 'trio-asym',
    slot_count: 3,
    slots: [
      { x: 0,    y: 0,    w: 0.66, h: 1 },
      { x: 0.66, y: 0,    w: 0.34, h: 0.5 },
      { x: 0.66, y: 0.5,  w: 0.34, h: 0.5 },
    ],
    aspect: 'square',
    label: '3 photos (hero left + 2 stacked right)',
  },
  'trio-asym-r': {
    id: 'trio-asym-r',
    slot_count: 3,
    slots: [
      { x: 0,    y: 0,    w: 0.34, h: 0.5 },
      { x: 0,    y: 0.5,  w: 0.34, h: 0.5 },
      { x: 0.34, y: 0,    w: 0.66, h: 1 },
    ],
    aspect: 'square',
    label: '3 photos (2 stacked left + hero right)',
  },
  'trio-h': {
    id: 'trio-h',
    slot_count: 3,
    slots: [
      { x: 0,     y: 0, w: 0.333, h: 1 },
      { x: 0.333, y: 0, w: 0.334, h: 1 },
      { x: 0.667, y: 0, w: 0.333, h: 1 },
    ],
    aspect: 'square',
    label: '3 photos (vertical strips)',
  },
  'trio-v': {
    id: 'trio-v',
    slot_count: 3,
    slots: [
      { x: 0, y: 0,     w: 1, h: 0.333 },
      { x: 0, y: 0.333, w: 1, h: 0.334 },
      { x: 0, y: 0.667, w: 1, h: 0.333 },
    ],
    aspect: 'square',
    label: '3 photos (horizontal strips)',
  },
  'quad-grid': {
    id: 'quad-grid',
    slot_count: 4,
    slots: [
      { x: 0,   y: 0,   w: 0.5, h: 0.5 },
      { x: 0.5, y: 0,   w: 0.5, h: 0.5 },
      { x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    aspect: 'square',
    label: '4 photos (2×2 grid)',
  },
  'quad-asym': {
    id: 'quad-asym',
    slot_count: 4,
    slots: [
      { x: 0,    y: 0,    w: 0.66, h: 0.66 },
      { x: 0.66, y: 0,    w: 0.34, h: 0.33 },
      { x: 0.66, y: 0.33, w: 0.34, h: 0.33 },
      { x: 0,    y: 0.66, w: 1,    h: 0.34 },
    ],
    aspect: 'square',
    label: '4 photos (hero + 3)',
  },
  'six-grid': {
    id: 'six-grid',
    slot_count: 6,
    slots: [
      { x: 0,     y: 0,     w: 0.333, h: 0.5 },
      { x: 0.333, y: 0,     w: 0.334, h: 0.5 },
      { x: 0.667, y: 0,     w: 0.333, h: 0.5 },
      { x: 0,     y: 0.5,   w: 0.333, h: 0.5 },
      { x: 0.333, y: 0.5,   w: 0.334, h: 0.5 },
      { x: 0.667, y: 0.5,   w: 0.333, h: 0.5 },
    ],
    aspect: 'square',
    label: '6 photos (3×2 grid)',
  },
  'cal-month': {
    id: 'cal-month',
    slot_count: 1,
    slots: [{ x: 0, y: 0, w: 1, h: 0.55 }],
    aspect: 'landscape',
    label: '1 photo on top + grid',
    calendarGrid: { x: 0, y: 0.55, w: 1, h: 0.45 },
  },
  'cal-month-bottom': {
    id: 'cal-month-bottom',
    slot_count: 1,
    slots: [{ x: 0, y: 0.45, w: 1, h: 0.55 }],
    aspect: 'landscape',
    label: '1 photo on bottom + grid',
    calendarGrid: { x: 0, y: 0, w: 1, h: 0.45 },
  },
  'cal-side': {
    id: 'cal-side',
    slot_count: 1,
    slots: [{ x: 0, y: 0, w: 0.5, h: 1 }],
    aspect: 'landscape',
    label: '1 photo left + grid right',
    calendarGrid: { x: 0.5, y: 0, w: 0.5, h: 1 },
  },
  'cal-side-r': {
    id: 'cal-side-r',
    slot_count: 1,
    slots: [{ x: 0.5, y: 0, w: 0.5, h: 1 }],
    aspect: 'landscape',
    label: '1 photo right + grid left',
    calendarGrid: { x: 0, y: 0, w: 0.5, h: 1 },
  },
  'cal-pair-top': {
    id: 'cal-pair-top',
    slot_count: 2,
    slots: [
      { x: 0,   y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    ],
    aspect: 'landscape',
    label: '2 photos on top + grid',
    calendarGrid: { x: 0, y: 0.5, w: 1, h: 0.5 },
  },
  'cal-pair-bottom': {
    id: 'cal-pair-bottom',
    slot_count: 2,
    slots: [
      { x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    aspect: 'landscape',
    label: '2 photos on bottom + grid',
    calendarGrid: { x: 0, y: 0, w: 1, h: 0.5 },
  },
  'cal-trio-top': {
    id: 'cal-trio-top',
    slot_count: 3,
    slots: [
      { x: 0,     y: 0, w: 0.333, h: 0.45 },
      { x: 0.333, y: 0, w: 0.334, h: 0.45 },
      { x: 0.667, y: 0, w: 0.333, h: 0.45 },
    ],
    aspect: 'landscape',
    label: '3 photos on top + grid',
    calendarGrid: { x: 0, y: 0.45, w: 1, h: 0.55 },
  },
  'cal-trio-bottom': {
    id: 'cal-trio-bottom',
    slot_count: 3,
    slots: [
      { x: 0,     y: 0.55, w: 0.333, h: 0.45 },
      { x: 0.333, y: 0.55, w: 0.334, h: 0.45 },
      { x: 0.667, y: 0.55, w: 0.333, h: 0.45 },
    ],
    aspect: 'landscape',
    label: '3 photos on bottom + grid',
    calendarGrid: { x: 0, y: 0, w: 1, h: 0.55 },
  },
};

/**
 * Templates compatible with album pages (aspect: square). Used to
 * populate the template-swap dropdown for album pages.
 */
export function albumTemplates(): Template[] {
  return Object.values(TEMPLATES).filter((t) => t.aspect === 'square');
}

/**
 * Templates compatible with calendar pages (aspect: landscape).
 */
export function calendarTemplates(): Template[] {
  return Object.values(TEMPLATES).filter((t) => t.aspect === 'landscape');
}

export function getTemplate(id: string): Template {
  const t = TEMPLATES[id];
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}

/** Two slots whose rectangles share an edge — used to draw mid-edge swap
 *  buttons on multi-slot templates. Coordinates are in the same 0..1 unit
 *  square as `SlotLayout`. */
export interface SharedEdge {
  slotA: number;
  slotB: number;
  orientation: 'vertical' | 'horizontal';
  /** Midpoint of the shared edge in unit coords. */
  x: number;
  y: number;
}

const EPS = 0.001;

export function computeSharedEdges(template: Template): SharedEdge[] {
  const edges: SharedEdge[] = [];
  const slots = template.slots;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      // Vertical shared edge: a's right or b's right meets the other's left.
      for (const [left, right] of [[a, b], [b, a]] as const) {
        if (Math.abs(left.x + left.w - right.x) < EPS) {
          const yStart = Math.max(left.y, right.y);
          const yEnd = Math.min(left.y + left.h, right.y + right.h);
          if (yEnd - yStart > EPS) {
            edges.push({
              slotA: i,
              slotB: j,
              orientation: 'vertical',
              x: right.x,
              y: yStart + (yEnd - yStart) / 2,
            });
          }
        }
      }
      // Horizontal shared edge: a's bottom or b's bottom meets the other's top.
      for (const [top, bottom] of [[a, b], [b, a]] as const) {
        if (Math.abs(top.y + top.h - bottom.y) < EPS) {
          const xStart = Math.max(top.x, bottom.x);
          const xEnd = Math.min(top.x + top.w, bottom.x + bottom.w);
          if (xEnd - xStart > EPS) {
            edges.push({
              slotA: i,
              slotB: j,
              orientation: 'horizontal',
              x: xStart + (xEnd - xStart) / 2,
              y: bottom.y,
            });
          }
        }
      }
    }
  }
  return edges;
}
