/**
 * Static lists of public holidays for seeding the events table. Each entry
 * is yearly-recurring (year = null at insert time). User can prune any
 * they don't want.
 */

export interface HolidayPreset {
  month: number; // 1..12
  day: number;   // 1..31
  label: string;
}

/** Estonian public holidays (fixed-date only — Easter etc. omitted since
 *  they shift yearly and would need separate handling). */
export const ESTONIAN_HOLIDAYS: HolidayPreset[] = [
  { month: 1,  day: 1,  label: 'Uusaasta' },
  { month: 2,  day: 24, label: 'Iseseisvuspäev' },
  { month: 5,  day: 1,  label: 'Kevadpüha' },
  { month: 6,  day: 23, label: 'Võidupüha' },
  { month: 6,  day: 24, label: 'Jaanipäev' },
  { month: 8,  day: 20, label: 'Taasiseseisvumispäev' },
  { month: 12, day: 24, label: 'Jõululaupäev' },
  { month: 12, day: 25, label: 'Esimene jõulupüha' },
  { month: 12, day: 26, label: 'Teine jõulupüha' },
];

/** US federal holidays with fixed dates. (Thanksgiving / MLK Day / Memorial
 *  Day shift weekly — omitted for simplicity.) */
export const US_HOLIDAYS: HolidayPreset[] = [
  { month: 1,  day: 1,  label: "New Year's Day" },
  { month: 7,  day: 4,  label: 'Independence Day' },
  { month: 11, day: 11, label: 'Veterans Day' },
  { month: 12, day: 25, label: 'Christmas Day' },
];

export const HOLIDAY_PRESETS: Record<string, HolidayPreset[]> = {
  estonian: ESTONIAN_HOLIDAYS,
  us: US_HOLIDAYS,
};
