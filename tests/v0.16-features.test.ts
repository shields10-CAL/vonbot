import { describe, it, expect } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep } from '../src/core/machine';
import { branchDecision } from '../src/core/branchDecision';
import { transferPlan } from '../src/core/flowModel';
import { parseBlocks, stringifyBlocks } from '../src/components/BlockEditor';

describe('VonBot 0.16 regressions',()=>{
 it('preserves spaces in an inline block comment while editing',()=>{
   const before='START: INP ; Take two numbers ';
   const blocks=parseBlocks(before);
   expect(blocks[0].comment).toBe('Take two numbers ');
   expect(stringifyBlocks(blocks)).toContain('Take two numbers ');
 });
 it('preserves standalone comments with spaces',()=>{
   const text='; My first program\nINP\n; More notes here';
   expect(stringifyBlocks(parseBlocks(text))).toBe(text);
 });
 it('BRZ checks the current accumulator and changes the next address correctly',()=>{
   const branch=branchDecision('BRZ',0,false,4);
   expect(branch.success).toBe(true);
   expect(branch.result).toContain('04');
   expect(branchDecision('BRZ',3,false,4).success).toBe(false);
 });
 it('BRP checks the negative flag rather than wrapped accumulator',()=>{
   expect(branchDecision('BRP',9999,true,4).success).toBe(false);
   expect(branchDecision('BRP',9999,false,4).success).toBe(true);
 });
 it('conditional branches send their accumulator value into the Arithmetic Unit for checking',()=>{
   const asm=assemble('LDI 0\nBRZ TARGET\nHLT\nTARGET: HLT',16);
   let m=createMachine(asm);
   for(let i=0;i<6;i++)m=microstep(m); // LDI through Execute, BRZ through Execute
   expect(m.lastBranchTaken).toBe(true);
   expect(transferPlan(m).some(t=>t.from==='acc'&&t.to==='alu')).toBe(true);
 });
 it('ADD sends both operands into the ALU before the result returns',()=>{
   const asm=assemble('LDI 3\nADD A\nHLT\nA DAT 4',16);
   let m=createMachine(asm);
   for(let i=0;i<6;i++)m=microstep(m);
   const plan=transferPlan(m);
   expect(plan.filter(x=>x.to==='alu').map(x=>x.from)).toContain('acc');
   expect(plan.filter(x=>x.to==='alu').map(x=>x.from)).toContain('memoryOperand');
   expect(plan.some(x=>x.from==='alu'&&x.to==='acc'&&x.value==='0007')).toBe(true);
 });
});
