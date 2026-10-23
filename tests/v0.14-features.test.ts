import { describe, it, expect } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, enqueueInput, microstep } from '../src/core/machine';
import { transferPlan, visiblePhase } from '../src/core/flowModel';
import { presentationMachine } from '../src/core/presentation';

const make=(source:string)=>createMachine(assemble(source,16));
const throughDecode=(source:string)=>microstep(microstep(microstep(make(source))));

describe('VonBot v0.14 phase-by-phase visualization',()=>{
  it('fetches the raw word and exposes no decoded command until Decode',()=>{
    const m=microstep(make('INP\nHLT'));
    expect(visiblePhase(m)).toBe('FETCH');
    expect(transferPlan(m).map(t=>t.to)).toEqual(['control','memoryInstruction','decodeInbox']);
    expect(transferPlan(m)[2].value).toBe('1000');
  });
  it('physically splits the fetched word along two separate rails',()=>{
    const m=microstep(microstep(make('STA 15\nHLT')));
    expect(transferPlan(m).map(t=>t.to)).toEqual(['decodeJunction','ir','ar']);
    expect(transferPlan(m).slice(1).map(t=>t.value)).toEqual(['03','15']);
  });
  it('does not dim the screen for input before Execute transfer finishes',()=>{
    const previous=microstep(microstep(make('INP\nHLT')));
    const next=microstep(previous);
    expect(next.status).toBe('waiting');
    expect(presentationMachine(next,previous,['executeInbox']).status).toBe('ready');
    expect(presentationMachine(next,previous,['executeInbox','complete']).status).toBe('waiting');
  });
  it('does not expose a red HLT state until the command finishes arriving',()=>{
    const before=microstep(microstep(make('HLT')));
    const after=microstep(before);
    expect(after.status).toBe('halted');
    expect(presentationMachine(after,before,['executeInbox']).status).toBe('ready');
    expect(presentationMachine(after,before,['executeInbox','complete']).status).toBe('halted');
  });
  it('moves the old PC value to ALU and the new value back',()=>{
    const previous=microstep(microstep(make('LDI 5\nHLT')));
    const next=microstep(previous);
    const moves=transferPlan(next,previous);
    expect(moves).toContainEqual(expect.objectContaining({from:'pc',to:'alu',value:'00'}));
    expect(moves).toContainEqual(expect.objectContaining({from:'alu',to:'pc',value:'01'}));
    expect(moves.some(t=>t.from==='pc'&&t.value==='+1')).toBe(false);
  });
  it('input completion adds to Accumulator only when its token arrives',()=>{
    const waiting=throughDecode('INP\nHLT');
    const next=microstep(enqueueInput(waiting,42));
    expect(transferPlan(next,waiting)).toContainEqual(expect.objectContaining({from:'input',to:'acc',value:'0042'}));
    expect(presentationMachine(next,waiting,['input']).acc).toBe(waiting.acc);
    expect(presentationMachine(next,waiting,['acc']).acc).toBe(42);
  });
  it('random result travels from Arithmetic Unit to Accumulator',()=>{
    const old=microstep(microstep(make('RND\nHLT')));
    const next=microstep(old);
    expect(transferPlan(next,old)).toContainEqual(expect.objectContaining({from:'alu',to:'acc'}));
  });
});
