import { describe, it, expect } from 'vitest';
import {assemble} from '../src/core/assembler';
import {ramUsage} from '../src/core/ramUsage';
import {INSTRUCTIONS} from '../src/data/instructions';
import {OPCODE_IDS} from '../src/core/assembler';

describe('VonBot RAM occupancy and reference',()=>{
 it('counts DAT 0 even though its numeric contents are zero',()=>{
  const asm=assemble('INP\nSTA VALUE\nOUT\nHLT\nVALUE DAT 0',16);
  expect(asm.diagnostics).toEqual([]);
  expect(ramUsage(asm.kinds)).toEqual({used:5,capacity:16,percent:31,severity:'success'});
 });
 it('counts actual addressed cells and scales with RAM size',()=>{
  expect(ramUsage(Array(16).fill('instruction'))).toEqual({used:16,capacity:16,percent:100,severity:'error'});
  expect(ramUsage([...Array(7).fill('dat'),...Array(3).fill('instruction'),...Array(6).fill('empty')])).toMatchObject({percent:63,severity:'warning'});
 });
 it('covers every executable opcode in the help reference',()=>{
  const described=INSTRUCTIONS.filter(x=>x.op in OPCODE_IDS);
  expect(new Set(described.map(x=>x.op)).size).toBe(13);
  expect(described.every(x=>x.long.length>15)).toBe(true);
 });
});
