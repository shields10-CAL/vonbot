import { describe,it,expect } from 'vitest';
import { assemble, decode } from '../src/core/assembler';
import { createMachine, microstep, runToCompletion } from '../src/core/machine';
import { transferPlan } from '../src/core/flowModel';

describe('VonBot 0.17 regression coverage',()=>{
 it('decodes DAT 20 as HLT when execution falls into the data word',()=>{
   const asm=assemble('LDA 1\nDAT 20',8);
   expect(asm.diagnostics).toHaveLength(0);
   expect(asm.warnings.some(w=>w.message.includes('Execution may reach DAT'))).toBe(true);
   expect(decode(asm.memory[1]).mnemonic).toBe('HLT');
   const m=runToCompletion(asm,[]);
   expect(m.status).toBe('halted');
   expect(m.acc).toBe(20);
   expect(m.pc).toBe(1);
 });
 it('warns only when the previous instruction could fall through into DAT',()=>{
   const good=assemble('LDA VALUE\nHLT\nVALUE: DAT 20',8);
   expect(good.warnings.filter(w=>w.message.includes('Execution may reach DAT'))).toHaveLength(0);
   expect(runToCompletion(good,[]).status).toBe('halted');
 });
 it('retains strict unknown handling for operand-free commands other than HLT',()=>{
   expect(decode(20).mnemonic).toBe('HLT');
   expect(decode(1001).valid).toBe(false);
 });
 it('shows two distinct source orbs for ADD before the ALU return',()=>{
   const asm=assemble('LDI 5\nADD VALUE\nHLT\nVALUE DAT 7',8);
   let m=createMachine(asm);let old=m;
   for(let i=0;i<6;i++){old=m;m=microstep(m);}
   const transfers=transferPlan(m,old);
   expect(transfers.some(t=>t.from==='acc'&&t.to==='alu'&&t.value==='0005')).toBe(true);
   expect(transfers.some(t=>t.from==='memoryOperand'&&t.to==='alu'&&t.value==='0007')).toBe(true);
   expect(transfers.some(t=>t.from==='alu'&&t.to==='acc'&&t.value==='0012')).toBe(true);
 });
 it('RND originates in the Arithmetic Unit, and changes the Accumulator',()=>{
   const asm=assemble('RND\nHLT',8);
   let m=createMachine(asm,123);
   for(let i=0;i<3;i++)m=microstep(m);
   expect(transferPlan(m).some(t=>t.from==='alu'&&t.to==='acc')).toBe(true);
 });
});
