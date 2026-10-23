import type { Machine } from './machine';

/** Rewind to the previous instruction boundary. Pure and deterministic, including queued
 * inputs, memory writes, output, RNG, status flags, and execution registers. */
export function rewindInstruction(current: Machine, past: Machine[]): { machine:Machine; history:Machine[] } | null {
  if(past.length===0)return null;
  let at=past.length-1;
  while(at>0){
    const candidate=past[at];
    if(candidate.phase==='fetch' && candidate.status==='ready' &&
      (current.phase!=='fetch' || candidate.steps<current.steps))break;
    at--;
  }
  return {machine:past[at],history:past.slice(0,at)};
}
