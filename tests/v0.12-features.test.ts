import { describe, expect, it } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep } from '../src/core/machine';
import { splitWordParts } from '../src/core/wordFormat';
import { MIN_VELOCITY, MAX_VELOCITY, advanceAnimationClock } from '../src/core/liveSpeed';
import { transferPlan } from '../src/core/flowModel';

describe('VonBot v0.12',()=>{
 it('Fetch delivers full four-digit instruction to the dedicated Decode inbox',()=>{
  let m=createMachine(assemble('INP\nOUT\nHLT',8));m=microstep(m);
  expect(transferPlan(m).at(-1)).toMatchObject({from:'memoryInstruction',to:'decodeInbox',value:'1000'});
 });
 it('Decode resolves opcode and operand and then loads the Execute inbox',()=>{
  let m=createMachine(assemble('ADD 02\nHLT\nDAT 4',8));m=microstep(m);m=microstep(m);
  expect(transferPlan(m).map(t=>t.to)).toEqual(['decodeJunction','ir','ar']);
  expect(transferPlan(m)[1].value).toBe('01');
  expect(transferPlan(m)[2].value).toBe('02');
  expect(transferPlan(m).some(t=>t.to==='executeInbox')).toBe(false);
 });
 it('uses consistent visual segments for decimal and 7-bit binary',()=>{
  expect(splitWordParts(315,'decimal')).toEqual(['03','15']);
  expect(splitWordParts(315,'binary')).toEqual(['0000011','0001111']);
  expect(splitWordParts(9999,'binary')).toEqual(['1100011','1100011']);
 });
 it('supports all power-of-two configured memory sizes',()=>{
  for(const n of [8,16,32,64]){const a=assemble('HLT\nV DAT 0',n);expect(a.memory).toHaveLength(n);expect(a.diagnostics).toEqual([]);}
 });
 it('updates animation time from current velocity without resetting clock',()=>{
  expect(MIN_VELOCITY).toBe(115);expect(MAX_VELOCITY).toBe(1440);
  const a=advanceAnimationClock(0,100,230);
  const b=advanceAnimationClock(a,100,1440);
  const c=advanceAnimationClock(b,100,115);
  expect(a).toBe(50);expect(b-a).toBeCloseTo(1440/460*100);expect(c-b).toBe(25);
 });
});
