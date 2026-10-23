import { describe, expect, it } from 'vitest';
import { assemble, decode, OPCODE_IDS } from '../src/core/assembler';
import { runToCompletion, outputText, nextRandom, stepInstruction, createMachine, microstep } from '../src/core/machine';
import { EXAMPLES } from './fixtures/programs';

describe('assembler', () => {
  it('assembles comments, symbolic labels, and machine words', () => {
    const r = assemble('INP\nSTA FIRST\nINP\nADD FIRST\nOUT\nHLT\nFIRST DAT 0');
    expect(r.diagnostics).toEqual([]);
    expect(r.memory.slice(0,7)).toEqual([1000,306,1000,106,1100,0,0]);
    expect(r.kinds[6]).toBe('dat');
  });
  it('supports .ORG, absolute addresses and aliases', () => {
    const r = assemble('LDA DATA\nOTC\nHLT\n.ORG 90\nDATA DAT 72');
    expect(r.diagnostics).toEqual([]);
    expect(r.memory[0]).toBe(490);
    expect(r.memory[1]).toBe(1200);
    expect(r.memory[90]).toBe(72);
    expect(assemble('INP\nHLT\n90 DAT 5').memory[90]).toBe(5);
  });
  it('uses unique 00–12 instruction codes in OOAA words', () => {
    expect(Object.values(OPCODE_IDS)).toHaveLength(13);
    expect(new Set(Object.values(OPCODE_IDS)).size).toBe(13);
    for (const [name, code] of Object.entries(OPCODE_IDS)) {
      expect(Number(code)).toBeLessThan(20);
      expect(decode(Number(code) * 100).mnemonic).toBe(name);
    }
    expect(assemble('INP\nOUT\nOUTC\nRND\nLDI 07').memory.slice(0,5)).toEqual([1000,1100,1200,900,807]);
    expect(decode(1300).valid).toBe(false);
    expect(decode(1001).valid).toBe(false);
    expect(assemble('DAT 9999').memory[0]).toBe(9999);
  });
  it('reports errors instead of silently generating instructions', () => {
    expect(assemble('ADD MISSING').diagnostics[0].message).toMatch(/valid label/);
    expect(assemble('RND').memory[0]).toBe(900);
    expect(assemble('LDI 101').diagnostics[0].message).toMatch(/literal/);
    expect(assemble('INP\nINP\nINP', 2).diagnostics.length).toBeGreaterThan(0);
    expect(decode(1999).valid).toBe(false);
  });
});

describe('execution', () => {
  it('adds user numbers', () => {
    const m = runToCompletion(assemble(EXAMPLES[0].source), [7,5]);
    expect(m.status).toBe('halted');
    expect(m.output).toEqual([{ type:'number', value: 12 }]);
  });
  it('counts down and handles zero', () => {
    expect(runToCompletion(assemble(EXAMPLES[1].source), [3]).output.map(t=>t.value)).toEqual([3,2,1,0]);
    expect(runToCompletion(assemble(EXAMPLES[1].source), [0]).output.map(t=>t.value)).toEqual([0]);
  });
  it('prints text with ASCII', () => {
    expect(outputText(runToCompletion(assemble(EXAMPLES[2].source), []).output)).toBe('HI\n');
  });
  it('uses deterministic random numbers and correct comparisons', () => {
    const guess = nextRandom(12345).value;
    expect(outputText(runToCompletion(assemble(EXAMPLES[3].source), [guess], 12345).output)).toBe('Y');
    expect(outputText(runToCompletion(assemble(EXAMPLES[3].source), [999], 12345).output)).toBe('N');
  });
  it('multiplies by repeated addition', () => {
    for (const [a,b] of [[3,4],[0,7],[9,9],[12,4],[8,0]]) {
      const m = runToCompletion(assemble(EXAMPLES[4].source), [a,b]);
      expect(m.status).toBe('halted');
      expect(m.output.at(-1)?.value).toBe(a*b);
    }
  });
  it('microsteps through fetch, decode and execute', () => {
    const a = assemble('LDI 42\nOUT\nHLT');
    const s = createMachine(a);
    const f = microstep(s); expect(f.phase).toBe('decode'); expect(f.ir).toBe(842); expect(f.pc).toBe(0);
    const d = microstep(f); expect(d.phase).toBe('execute');
    const e = microstep(d); expect(e.phase).toBe('fetch'); expect(e.acc).toBe(42); expect(e.pc).toBe(1);
    expect(stepInstruction(e).output[0].value).toBe(42);
  });
  it('stores four-digit data and wraps arithmetic at 10000',()=>{
    const r=runToCompletion(assemble('LDA BIG\nADD TWO\nOUT\nHLT\nBIG DAT 9999\nTWO DAT 2'),[]);
    expect(r.output[0].value).toBe(1);
  });
  it('pauses for missing input without consuming it', () => {
    const m = runToCompletion(assemble('INP\nOUT\nHLT'), []);
    expect(m.status).toBe('waiting'); expect(m.phase).toBe('execute');
  });
  it('keeps a borrow flag for BRP comparisons', () => {
    const src = 'INP\nSTA A\nINP\nSUB A\nBRP YES\nLDI 78\nOUTC\nHLT\nYES LDI 89\nOUTC\nHLT\nA DAT 0';
    expect(outputText(runToCompletion(assemble(src), [7,4]).output)).toBe('N');
    expect(outputText(runToCompletion(assemble(src), [4,7]).output)).toBe('Y');
  });
});
