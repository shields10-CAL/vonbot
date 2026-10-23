import LZString from 'lz-string';
export type Project = { version: 1; name: string; source: string; memorySize: 8 | 16 | 32 | 64; extended: boolean; seed: number | null; seedMode?: 'time' | 'manual'; modifiedAt: number };
export const defaultProject = (): Project => ({ version: 1, name: 'My first VonBot program', source: '; Enter your program below\nINP\nSTA FIRST\nINP\nADD FIRST\nOUT\nHLT\nFIRST DAT 0', memorySize: 64, extended: true, seed: null, seedMode: 'time', modifiedAt: Date.now() });
const KEY = 'lmc2.project.v1';
export function validateProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Partial<Omit<Project, 'memorySize'>> & { memorySize?: number };
  if (v.version !== 1 || typeof v.source !== 'string' || v.source.length > 100000 || typeof v.name !== 'string' || v.name.length > 150 || ![8,16,32,36,64,100,128].includes(v.memorySize ?? 0) || typeof v.extended !== 'boolean' || (v.seed !== null && (typeof v.seed !== 'number' || !Number.isFinite(v.seed)))) return null;
  return { version: 1, name: v.name === 'My first LMC program' ? 'My first VonBot program' : v.name, source: v.source, memorySize: (v.memorySize === 128 || v.memorySize === 100 ? 64 : v.memorySize === 36 ? 32 : v.memorySize) as Project['memorySize'], extended: true, seed: v.seedMode === undefined && v.seed === 12345 ? null : v.seed!, seedMode: v.seedMode ?? (v.seed === 12345 || v.seed === null ? 'time' : 'manual'), modifiedAt: Number(v.modifiedAt) || Date.now() };
}
export function loadProject(): Project {
  try {
    const hash = location.hash.slice(1);
    if (hash.startsWith('project=')) {
      const decoded = LZString.decompressFromEncodedURIComponent(hash.slice(8));
      const shared = validateProject(JSON.parse(decoded || 'null'));
      if (shared) return { ...shared, name: shared.name + ' (shared copy)' };
    }
    const saved = localStorage.getItem(KEY);
    if (saved) return validateProject(JSON.parse(saved)) ?? defaultProject();
  } catch { /* localStorage can be unavailable; invalid shared link falls back */ }
  return defaultProject();
}
export function saveProject(p: Project): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
}
export function shareURL(p: Project): string {
  const payload = LZString.compressToEncodedURIComponent(JSON.stringify(p));
  return `${location.origin}${location.pathname}#project=${payload}`;
}
export function exportText(name: string, contents: string, type = 'text/plain'): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function fileSafe(name: string) { return name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0,70) || 'vonbot-program'; }
