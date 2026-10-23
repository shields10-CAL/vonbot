import {describe,it,expect} from 'vitest';
import {assemble} from '../src/core/assembler';
import {createMachine,microstep} from '../src/core/machine';
import {transferPlan} from '../src/core/flowModel';
import {advanceAnimationClock,MAX_VELOCITY,MIN_VELOCITY,isTurboSpeed} from '../src/core/liveSpeed';
import {BRZ_CHECK_DELAY_MS} from '../src/core/animationTiming';
import {parseBlocks,stringifyBlocks} from '../src/components/BlockEditor';

describe('VonBot v0.19 branch flow and editor compatibility',()=>{
  it('routes an unconditional jump through the Arithmetic Unit to the Program Counter',()=>{
    let m=createMachine(assemble('BRA END\nOUT\nEND HLT',16));
    const fetch=microstep(m),decoded=microstep(fetch);m=microstep(decoded);
    const moves=transferPlan(m,decoded);
    expect(m.lastBranchTaken).toBe(true);
    expect(moves.some(t=>t.from==='decode'&&t.to==='alu'&&t.value==='02')).toBe(true);
    expect(moves.some(t=>t.from==='alu'&&t.to==='pc'&&t.value==='02')).toBe(true);
    expect(moves.some(t=>t.from==='decode'&&t.to==='pc')).toBe(false);
  });
  it('keeps conditional not-taken PC increment routed through ALU',()=>{
    let m=createMachine(assemble('LDI 1\nBRZ END\nHLT\nEND HLT',16));
    for(let n=0;n<5;n++)m=microstep(m);
    const old=m;m=microstep(m);
    expect(m.lastBranchTaken).toBe(false);
    expect(transferPlan(m,old).some(t=>t.from==='pc'&&t.to==='alu')).toBe(true);
  });
  it('preserves inline comments when toggled off in the editor',()=>{
    const src='START: LDI 1 ; two words here\n; movable comment\nHLT';
    expect(stringifyBlocks(parseBlocks(src))).toContain('two words here');
    expect(stringifyBlocks(parseBlocks(src))).toContain('; movable comment');
  });
  it('only exposes 8, 16, 32, or 64 addresses as supported RAM sizes',()=>{
    for(const n of [8,16,32,64])expect(assemble('HLT',n).memory).toHaveLength(n);
  });
  it('retains the live velocity bounds used immediately before Turbo',()=>{
    expect(MIN_VELOCITY).toBe(115);
    expect(MAX_VELOCITY).toBe(1440);
    expect(BRZ_CHECK_DELAY_MS).toBe(2000);
    expect(isTurboSpeed(MAX_VELOCITY)).toBe(true);
    expect(isTurboSpeed(MAX_VELOCITY-1)).toBe(false);
    expect(advanceAnimationClock(100,100,MAX_VELOCITY)).toBeGreaterThan(advanceAnimationClock(100,100,MIN_VELOCITY));
  });
});
