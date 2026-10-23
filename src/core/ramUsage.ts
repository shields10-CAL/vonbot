import type { CellKind } from './assembler';

/** Occupied RAM cells, not non-zero numeric values: DAT 0 counts as used. */
export function ramUsage(kinds: readonly CellKind[]) {
  const capacity = kinds.length;
  const used = kinds.filter(kind => kind !== 'empty').length;
  const percent = capacity ? Math.round((used / capacity) * 100) : 0;
  const severity: 'success' | 'warning' | 'error' = percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success';
  return {used, capacity, percent, severity};
}
