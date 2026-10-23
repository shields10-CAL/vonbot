import { describe, expect, it } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep, runToCompletion } from '../src/core/machine';
import { transferPlan } from '../src/core/flowModel';
import { presentationMachine } from '../src/core/presentation';

const program=(src:string)=>createMachine(assemble(src,32));

describe('VonBot v0.15 execution compatibility',()=>{
  it('keeps comment/source line numbers distinct from RAM addresses for Blocks',()=>{
    const parsed=assemble('; comment\nSTART: LDI 7\n; between\nBRA START\nHLT',32);
    expect(parsed.lineToAddress[2]).toBe(0);
    expect(parsed.lineToAddress[4]).toBe(1);
    expect(parsed.symbols.START).toBe(0);
  });
  it('shows both ALU operands and the incremented PC in the execution flow',()=>{
    const assembly=assemble('LDI 3\nADD NUM\nHLT\nNUM DAT 4',32);
    let m=createMachine(assembly);
    for(let i=0;i<5;i++)m=microstep(m);
    const next=microstep(m);
    const transfers=transferPlan(next,m);
    expect(transfers).toContainEqual(expect.objectContaining({from:'acc',to:'alu',value:'0003'}));
    expect(transfers).toContainEqual(expect.objectContaining({from:'memoryOperand',to:'alu',value:'0004'}));
    expect(transfers).toContainEqual(expect.objectContaining({from:'alu',to:'acc',value:'0007'}));
    expect(transfers).toContainEqual(expect.objectContaining({from:'pc',to:'alu',value:'01'}));
    expect(transfers).toContainEqual(expect.objectContaining({from:'alu',to:'pc',value:'02'}));
  });
  it('holds Accumulator values until the result reaches it',()=>{
    let state=program('LDI 7\nHLT');
    state=microstep(microstep(state));
    const next=microstep(state);
    expect(presentationMachine(next,state,['executeInbox','alu']).acc).toBe(0);
    expect(presentationMachine(next,state,['acc']).acc).toBe(7);
  });
  it('does not increment the PC for HLT or permit further forward stepping',()=>{
    const old=microstep(microstep(program('HLT')));
    const halted=microstep(old);
    expect(halted.status).toBe('halted');
    expect(halted.pc).toBe(0);
    expect(microstep(halted)).toBe(halted);
  });
  it('still runs multiplication through repeated addition',()=>{
    const result=runToCompletion(assemble('INP\nSTA A\nINP\nSTA COUNT\nLDI 0\nSTA SUM\nLOOP: LDA COUNT\nBRZ END\nSUB ONE\nSTA COUNT\nLDA SUM\nADD A\nSTA SUM\nBRA LOOP\nEND: LDA SUM\nOUT\nHLT\nA DAT 0\nCOUNT DAT 0\nSUM DAT 0\nONE DAT 1',32),[4,3]);
    expect(result.output.map(t=>t.value)).toEqual([12]);
  });
});
