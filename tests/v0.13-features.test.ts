import { describe,it,expect } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep, enqueueInput, stepInstruction, runToCompletion } from '../src/core/machine';
import { transferPlan, visiblePhase } from '../src/core/flowModel';
import { parseBlocks, stringifyBlocks } from '../src/components/BlockEditor';

describe('v0.13 instructional handoffs',()=>{
  it('fetch goes through the control unit, and carries a raw four-digit word',()=>{
    const m=microstep(createMachine(assemble('INP\nHLT',8)));
    expect(visiblePhase(m)).toBe('FETCH');
    expect(transferPlan(m).map(t=>t.to)).toEqual(['control','memoryInstruction','decodeInbox']);
    expect(transferPlan(m)[2].value).toBe('1000');
  });
  it('decodes to two register values, but does not send mnemonic until next Step',()=>{
    let m=createMachine(assemble('ADD 03\nHLT\nDAT 0\nDAT 7',8));
    m=microstep(m);m=microstep(m);
    expect(transferPlan(m).map(t=>t.to)).toEqual(['decodeJunction','ir','ar']);
    expect(transferPlan(m).slice(1).map(t=>t.value)).toEqual(['01','03']);
    m=microstep(m);expect(transferPlan(m)[0]).toMatchObject({from:'decode',to:'executeInbox',value:'ADD'});
  });
  it('input request delivers mnemonic once, then moves input directly into accumulator',()=>{
    let m=createMachine(assemble('INP\nOUT\nHLT',8));
    m=microstep(m);m=microstep(m);m=microstep(m);
    expect(m.status).toBe('waiting');
    expect(transferPlan(m).map(t=>t.to)).toEqual(['executeInbox']);
    const previous=m;m=microstep(enqueueInput(m,42));
    expect(transferPlan(m,previous).some(t=>t.to==='executeInbox')).toBe(false);
    expect(transferPlan(m,previous)).toContainEqual(expect.objectContaining({from:'input',to:'acc',value:'0042'}));
  });
  it('uses two simultaneous input values into the Arithmetic Unit',()=>{
    const asm=assemble('LDI 4\nADD VALUE\nHLT\nVALUE DAT 3',8);
    const a=stepInstruction(createMachine(asm)),b=stepInstruction(a);
    expect(transferPlan(b,a).filter(t=>t.to==='alu').map(t=>t.from)).toContain('acc');
    expect(transferPlan(b,a).filter(t=>t.to==='alu').map(t=>t.from)).toContain('memoryOperand');
    expect(b.acc).toBe(7);
  });
  it('warns when a STA target is executable without blocking assembly',()=>{
    const a=assemble('INP\nSTA 04\nOUT\nHLT\nADD 00',8);
    expect(a.diagnostics).toEqual([]);expect(a.warnings).toHaveLength(1);
    expect(a.warnings[0].line).toBe(2);
    expect(a.warnings[0].message).toContain('memory address 04');
    expect(assemble('INP\nSTA VALUE\nOUT\nHLT\nVALUE DAT 0',8).warnings).toEqual([]);
  });
  it('preserves symbolic branch labels and indents all instruction columns',()=>{
    const source='START: INP\nBRZ END\nBRA START\nEND: HLT';
    const out=stringifyBlocks(parseBlocks(source));
    expect(out.split('\n')[1]).toMatch(/^\s+BRZ END/);
    expect(assemble(out,8).diagnostics).toEqual([]);
    expect(runToCompletion(assemble(out,8),[0]).status).toBe('halted');
  });
  it('halts permanently until CPU is reset or instruction is reversed',()=>{
    const m=stepInstruction(createMachine(assemble('HLT',8)));
    expect(m.status).toBe('halted');expect(microstep(m)).toBe(m);
  });
});
