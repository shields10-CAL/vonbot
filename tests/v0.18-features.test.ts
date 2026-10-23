import {describe,it,expect} from 'vitest';
import {assemble} from '../src/core/assembler';
import {createMachine,microstep,runToCompletion} from '../src/core/machine';
import {formatAssembly} from '../src/core/formatAssembly';
import {transferPlan} from '../src/core/flowModel';

describe('VonBot v0.18 — assembler and program safety',()=>{
 it('does not incorrectly warn about DAT following a completed program',()=>{
   const a=assemble('LDA H\nOUTC\nLDA I\nOUTC\nHLT\nH: DAT 72\nI: DAT 73',32);
   expect(a.warnings).toHaveLength(0);
   expect(runToCompletion(a,[]).status).toBe('halted');
 });
 it('warns when a branch can enter DAT, but not when HLT makes it unreachable',()=>{
   expect(assemble('BRA DATA\nHLT\nDATA DAT 9',8).warnings.some(w=>w.message.includes('Execution may reach DAT'))).toBe(true);
   expect(assemble('HLT\nDATA DAT 9',8).warnings.some(w=>w.message.includes('Execution may reach DAT'))).toBe(false);
 });
 it('explains subtracting an instruction and wrapping negative results',()=>{
   const a=assemble('RND\nOUT\nBRZ END\nSUB 0\nEND HLT',16);
   expect(a.warnings.some(w=>w.message.includes('SUB reads executable RND'))).toBe(true);
   const b=assemble('LDI 83\nSUB RND_CODE\nOUT\nHLT\nRND_CODE DAT 900',16);
   expect(runToCompletion(b,[]).output[0].value).toBe(9183);
 });
 it('formats source without changing the assembled memory or source line numbers',()=>{
   const source='LDA H\nOUTC\nLDA I\nOUTC\nHLT\nH: DAT 72   ; H\nI: DAT 73';
   const formatted=formatAssembly(source);
   expect(formatted.split('\n')).toHaveLength(source.split('\n').length);
   expect(formatted).toContain('H:        DAT');
   expect(assemble(source,32).memory).toEqual(assemble(formatted,32).memory);
 });
 it('supports the retained 8, 16, 32, and 64-address configurations',()=>{
   for(const capacity of [8,16,32,64])expect(assemble('HLT',capacity).memory).toHaveLength(capacity);
 });
});
describe('VonBot v0.18 — flow',()=>{
 it('non-taken BRZ routes the old counter into ALU and incremented counter back',()=>{
   const a=assemble('LDI 3\nBRZ END\nHLT\nEND HLT',16);
   let m=createMachine(a);for(let i=0;i<5;i++)m=microstep(m);
   const previous=m;m=microstep(m);
   const t=transferPlan(m,previous);
   expect(m.lastBranchTaken).toBe(false);
   expect(t.find(r=>r.from==='pc'&&r.to==='alu')?.value).toBe('01');
   expect(t.find(r=>r.from==='alu'&&r.to==='pc')?.value).toBe('02');
 });
 it('taken BRZ sets a branch target without incorrectly adding one',()=>{
   const a=assemble('LDI 0\nBRZ END\nHLT\nEND HLT',16);
   let m=createMachine(a);for(let i=0;i<5;i++)m=microstep(m);
   const previous=m;m=microstep(m);
   const t=transferPlan(m,previous);
   expect(m.lastBranchTaken).toBe(true);
   expect(t.some(x=>x.from==='decode'&&x.to==='alu'&&x.value==='03')).toBe(true);
   expect(t.some(x=>x.from==='alu'&&x.to==='pc'&&x.value==='03')).toBe(true);
   expect(t.some(x=>x.from==='pc'&&x.to==='alu')).toBe(false);
 });
});
