import { writable, type Writable } from 'svelte/store';

export interface IndexProgress {
  phase: 'idle' | 'walking' | 'indexing' | 'done' | 'error';
  scanned: number;
  total: number;
  current: string;
  errors: string[];
  projectId: number | null;
}

// Module-level singleton so progress survives navigation between dashboard
// and library views during an in-flight index. Only one indexing job can
// run at a time in v1; `projectId` lets the dashboard ignore state from a
// different project if the user multitasks.
export const indexProgress: Writable<IndexProgress> = writable({
  phase: 'idle',
  scanned: 0,
  total: 0,
  current: '',
  errors: [],
  projectId: null,
});
