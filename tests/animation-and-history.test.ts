import { describe, expect, it } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, enqueueInput, microstep, stepInstruction } from '../src/core/machine';
import { rewindInstruction } from '../src/core/history';
import { pointOnRail, transferPlan, visiblePhase } from '../src/core/flowModel';

describe('reversible instruction history', () => {
  it('restores RAM writes, output, and the accumulator exactly', () => {
    const program=assemble('LDI 7\nSTA X\nOUT\nHLT\nX DAT 0');
    let m=createMachine(program);const past:typeof m[]=[];
    for(let i=0;i<3;i++)for(let k=0;k<3;k++){past.push(m);m=microstep(m);}
    expect(m.memory[4]).toBe(7);expect(m.output).toHaveLength(1);
    const beforeOutput=rewindInstruction(m,past)!;
    expect(beforeOutput.machine.output).toHaveLength(0);
    const beforeStore=rewindInstruction(beforeOutput.machine,beforeOutput.history)!;
    expect(beforeStore.machine.memory[4]).toBe(0);
    expect(beforeStore.machine.acc).toBe(7);
    const beforeLoad=rewindInstruction(beforeStore.machine,beforeStore.history)!;
    expect(beforeLoad.machine.acc).toBe(0);
    expect(beforeLoad.machine.pc).toBe(0);
  });
  it('restores the deterministic random generator state',()=>{
    const m=createMachine(assemble('RND\nRND\nOUT\nHLT'),123);
    const past=[m,microstep(m),microstep(m)];
    const next=stepInstruction(m);
    expect(rewindInstruction(next,past)?.machine.rng).toBe(m.rng);
    expect(stepInstruction(rewindInstruction(next,past)!.machine).acc).toBe(next.acc);
  });
});

describe('animated data-transfer instructions',()=>{
  it('returns a real four-digit value from memory to Decode',()=>{
    let m=createMachine(assemble('INP\nOUT\nHLT'));
    m=microstep(m);
    const plan=transferPlan(m);
    expect(visiblePhase(m)).toBe('FETCH');
    expect(plan[0]).toMatchObject({from:'pc',to:'control',value:'00'});
    expect(plan[1]).toMatchObject({from:'control',to:'memoryInstruction',value:'00'});
    expect(plan[2]).toMatchObject({from:'memoryInstruction',to:'decodeInbox',value:'1000'});
  });
  it('sends the decoded command only when Execute begins',()=>{
    let m=createMachine(assemble('INP\nOUT\nHLT'));
    m=microstep(m);
    m=microstep(m);
    expect(visiblePhase(m)).toBe('DECODE');
    expect(transferPlan(m).some(t=>t.to==='executeInbox')).toBe(false);
    m=microstep(m);
    expect(transferPlan(m)).toContainEqual(expect.objectContaining({from:'decode',to:'executeInbox',value:'INP'}));
  });
  it('does not animate fake input while waiting, then routes submitted value to ACC',()=>{
    let m=createMachine(assemble('INP\nOUT\nHLT'));
    m=microstep(m);m=microstep(m);m=microstep(m);
    expect(m.status).toBe('waiting');expect(transferPlan(m).map(t=>t.to)).toEqual(['executeInbox']);
    const after=microstep(enqueueInput(m,42));
    expect(after.acc).toBe(42);
    expect(transferPlan(after).some(t=>t.from==='input'&&t.to==='acc'&&t.value==='0042')).toBe(true);
  });
  it('routes ALU arithmetic and PC increment, preserving both old and new values',()=>{
    const a=assemble('LDI 4\nADD V\nOUT\nHLT\nV DAT 2');
    const before=stepInstruction(createMachine(a));
    const after=stepInstruction(before);
    const plan=transferPlan(after,before);
    expect(plan).toContainEqual(expect.objectContaining({from:'acc',to:'alu',value:'0004'}));
    expect(plan).toContainEqual(expect.objectContaining({from:'alu',to:'acc',value:'0006'}));
    expect(plan).toContainEqual(expect.objectContaining({from:'pc',to:'alu',value:'01'}));
    expect(plan).toContainEqual(expect.objectContaining({from:'alu',to:'pc',value:'02'}));
    const increment=plan.find(t=>t.from==='pc'&&t.to==='alu');
    const returned=plan.find(t=>t.from==='alu'&&t.to==='pc');
    expect(increment?.length).toBeGreaterThanOrEqual(.1);
    expect(returned?.length).toBeGreaterThanOrEqual(.06);
    expect(returned!.start).toBeGreaterThan(increment!.start);
  });
  it('samples the entire rail rather than jumping to origin at first animation frame',()=>{
    const d='M20,40 H80 V100 H150';
    expect(pointOnRail(d,0)).toEqual({x:20,y:40});
    expect(pointOnRail(d,1)).toEqual({x:150,y:100});
    expect(pointOnRail(d,.5)).toEqual({x:80,y:75});
  });
});

// v0.9: CPU state is authoritative, but the UI should show changes only when
// the corresponding glowing token actually reaches its destination.
import { presentationMachine } from '../src/core/presentation';
import { timedRoutes, railDistance } from '../src/core/animationTiming';

describe('phase-specific register reveal and constant speed',()=>{
  it('splits the fetched four-digit word into two-digit opcode and operand',()=>{
    let m=createMachine(assemble('ADD 07\nHLT\nDAT 0\nDAT 0\nDAT 0\nDAT 0\nDAT 0\nDAT 3'));
    m=microstep(m);m=microstep(m);
    const plan=transferPlan(m);
    expect(plan.find(t=>t.to==='ir')?.value).toBe('01');
    expect(plan.find(t=>t.to==='ar')?.value).toBe('07');
  });
  it('gives every transfer the same pixel velocity regardless of length',()=>{
    const tracks=[{start:.05,d:'M0,0 H100'},{start:.52,d:'M0,0 H400'}];
    const times=timedRoutes(tracks,200);
    expect(times[0].endMs-times[0].startMs).toBe(500);
    expect(times[1].endMs-times[1].startMs).toBe(2000);
    expect(railDistance(tracks[1].d)).toBe(400);
  });
  it('runs simultaneous ALU inputs concurrently, at the same velocity',()=>{
    const transfers=[{start:.07,d:'M0,0 H60'},{start:.07,d:'M0,0 H200'}, {start:.30,d:'M0,0 H100'}];
    const times=timedRoutes(transfers,200);
    expect(times[0].startMs).toBe(times[1].startMs);
    expect(times[0].endMs).toBe(300);
    expect(times[1].endMs).toBe(1000);
    expect(times[2].startMs).toBeGreaterThan(1000);
  });
  it('keeps the old accumulator and PC visible until their tokens arrive',()=>{
    const asm=assemble('LDI 4\nADD VALUE\nOUT\nHLT\nVALUE DAT 3');
    const previous=stepInstruction(createMachine(asm));
    const next=stepInstruction(previous);
    const during=presentationMachine(next,previous,[]);
    expect(during.acc).toBe(4);expect(during.pc).toBe(1);
    const afterALU=presentationMachine(next,previous,['acc']);
    expect(afterALU.acc).toBe(7);expect(afterALU.pc).toBe(1);
    const done=presentationMachine(next,previous,['acc','pc']);
    expect(done.acc).toBe(7);expect(done.pc).toBe(2);
  });
});
