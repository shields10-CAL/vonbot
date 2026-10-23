/** Velocity is in screen-space pixels per second. The animation clock is measured
 *  at a fixed reference velocity, allowing on-the-fly changes with no reset. */
export const MIN_VELOCITY=115; // 2x slower than the prior 230 px/s slow preset
export const MAX_VELOCITY=1440; // 1.5x faster than the prior 960 px/s fast preset
export const DEFAULT_VELOCITY=230;
/** Turbo is a discrete state at the slider maximum, not simply a faster orb. */
export const isTurboSpeed=(velocity:number)=>velocity>=MAX_VELOCITY;
export const BASE_VELOCITY=460;
export function advanceAnimationClock(progressMs:number,deltaMs:number,velocity:number):number{
  const dt=Math.max(0,Math.min(150,deltaMs));
  const v=Math.max(MIN_VELOCITY,Math.min(MAX_VELOCITY,velocity));
  return progressMs+dt*v/BASE_VELOCITY;
}
