import { describe, expect, it } from 'vitest';
import { ADDRESS_COMMANDS, parseBlocks, stringifyBlocks } from '../src/components/BlockEditor';
import { visiblePhase, decodeExplanation } from '../src/components/DataFlowPanel';
import { transferPlan } from '../src/components/FlowRails';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep } from '../src/core/machine';

describe('blocks/code interoperability',()=>{
 it('preserves labels, operands and comments across editors',()=>{
  const source='; Hello LMC\nLOOP: LDA VALUE\nBRZ FINISH\nOUT\nFINISH HLT\nVALUE DAT 3';
  expect(stringifyBlocks(parseBlocks(source))).toBe(source);
 });
 it('roundtrips numeric memory-address declarations',()=>{
  expect(stringifyBlocks(parseBlocks('INP\nSTA 90\nHLT\n90 DAT 0'))).toBe('INP\nSTA 90\nHLT\n90 DAT 0');
 });
});

describe('phase and visual transfer routing',()=>{
 it('colors the phase corresponding to the last completed CPU microstep',()=>{
  let m=createMachine(assemble('LDA V\nOUT\nHLT\nV DAT 42'));
  expect(visiblePhase(m)).toBe('READY');
  m=microstep(m);expect(visiblePhase(m)).toBe('FETCH');expect(m.pc).toBe(0);
  expect(transferPlan(m).map(t=>[t.from,t.to])).toEqual([['pc','control'],['control','memoryInstruction'],['memoryInstruction','decodeInbox']]);
  m=microstep(m);expect(visiblePhase(m)).toBe('DECODE');
  m=microstep(m);expect(visiblePhase(m)).toBe('EXECUTE');
  expect(m.acc).toBe(42);expect(m.pc).toBe(1);
  expect(transferPlan(m).some(t=>t.from==='alu'&&t.to==='pc')).toBe(true);
 });
 it('decodes I/O instructions without inventing a memory-address operand',()=>{
  let m=createMachine(assemble('INP\nHLT'));
  m=microstep(m);m=microstep(m);
  expect(decodeExplanation(m)).toContain('request a number');
 });
 it('sends ADD through the Arithmetic Unit, followed by Program Counter increment',()=>{
  let m=createMachine(assemble('LDI 5\nADD V\nHLT\nV DAT 3'));
  for(let i=0;i<6;i++)m=microstep(m);
  const routes=transferPlan(m).map(t=>`${t.from}->${t.to}`);
  expect(m.acc).toBe(8);
  expect(routes).toContain('memoryOperand->alu');
  expect(routes).toContain('alu->acc');
  expect(routes).toContain('pc->alu');
  expect(routes).toContain('alu->pc');
 });
 it('does not increment PC after HALT and directs a taken branch to its target',()=>{
  let m=createMachine(assemble('BRA DONE\nOUT\nDONE HLT'));
  for(let i=0;i<3;i++)m=microstep(m);
  expect(m.pc).toBe(2);
  expect(transferPlan(m).some(t=>t.from==='alu'&&t.to==='pc')).toBe(false);
  for(let i=0;i<3;i++)m=microstep(m);
  expect(m.pc).toBe(2);expect(m.status).toBe('halted');
 });
 it('accepts RAM address drops for address-based instruction blocks',()=>{
  for(const op of ['LDA','STA','ADD','SUB','BRA','BRZ','BRP'])expect(ADDRESS_COMMANDS.has(op)).toBe(true);
  for(const op of ['DAT','LDI','INP','OUT','RND'])expect(ADDRESS_COMMANDS.has(op)).toBe(false);
 });
});
