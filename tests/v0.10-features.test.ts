import { describe, expect, it } from 'vitest';
import { assemble } from '../src/core/assembler';
import { createMachine, microstep, stepInstruction, runToCompletion } from '../src/core/machine';
import { parseBlocks, stringifyBlocks } from '../src/components/BlockEditor';

describe('v1.0 block labels and comments',()=>{
  it('preserves attached labels and inline comments through Blocks ⇄ Code',()=>{
    const source='; Beginning\nSTART: LDI 2\nOUT ; Print result\nBRA START\n';
    const blocks=parseBlocks(source);
    expect(blocks[1].label).toBe('START');
    expect(blocks[2].comment).toBe('Print result');
    expect(stringifyBlocks(blocks)).toBe(source);
    expect(assemble(stringifyBlocks(blocks)).diagnostics).toEqual([]);
  });
  it('supports reordered standalone comments',()=>{
    const blocks=parseBlocks('; A\nINP\n; B\nOUT');
    const moved=[blocks[2],blocks[1],blocks[0],blocks[3]];
    expect(stringifyBlocks(moved)).toBe('; B\nINP\n; A\nOUT');
  });
});

describe('v1.0 phase-level history',()=>{
  it('undoes precisely one phase, and executing again recreates the same state',()=>{
    const asm=assemble('LDI 4\nSTA VAL\nOUT\nHLT\nVAL DAT 0');
    let m=createMachine(asm);
    const past:typeof m[]=[];
    for(let n=0;n<6;n++){past.push(m);m=microstep(m);}
    expect(m.memory[4]).toBe(4);
    const old=past.pop()!;
    expect(old.phase).toBe('execute');
    expect(old.memory[4]).toBe(0);
    expect(microstep(old)).toEqual(m);
    expect(past.at(-1)?.phase).toBe('decode');
  });
});

describe('v1.0 DAT and RNG',()=>{
  it('shows DAT declarations differently from runtime memory writes',()=>{
    const asm=assemble('LDI 3\nSTA VALUE\nSTA 15\nHLT\nVALUE DAT 1');
    expect(asm.kinds[4]).toBe('dat');
    let m=createMachine(asm);m=stepInstruction(m);m=stepInstruction(m);m=stepInstruction(m);
    expect(m.kinds[4]).toBe('dat');expect(m.kinds[15]).toBe('data');
  });
  it('manual seeds are reproducible, differing seeds yield different sequences',()=>{
    const asm=assemble('RND\nOUT\nRND\nOUT\nRND\nOUT\nHLT');
    const a=runToCompletion(asm,[],104);const b=runToCompletion(asm,[],104);
    const c=runToCompletion(asm,[],105);
    expect(a.output).toEqual(b.output);expect(a.output).not.toEqual(c.output);
  });
});
