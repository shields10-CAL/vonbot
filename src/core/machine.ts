import { decode, addressLabel, word } from './assembler';
import type { AssemblyResult, CellKind } from './assembler';
export type MachineStatus = 'ready' | 'running' | 'waiting' | 'halted' | 'error';
export type MicroPhase = 'fetch' | 'decode' | 'execute';
export type OutputToken = { type: 'number' | 'character'; value: number };
export interface Machine {
  memory: number[]; kinds: CellKind[]; addressToLine: (number | null)[];
  pc: number; ir: number; mar: number; acc: number; negative: boolean;
  status: MachineStatus; phase: MicroPhase; activeAddress: number | null; lastBranchTaken:boolean;
  input: number[]; output: OutputToken[]; steps: number; rng: number;
  message: string; error?: string; extended: boolean;
}
export const seedValue = (seed: number): number => (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0;
export function nextRandom(seed: number): { seed: number; value: number } {
  const next = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return { seed: next, value: next % 100 };
}
export function createMachine(asm: AssemblyResult, seed = 12345, extended = true): Machine {
  return { memory: [...asm.memory], kinds: [...asm.kinds], addressToLine: [...asm.addressToLine], pc: 0,
    ir: 0, mar: 0, acc: 0, negative: false, status: 'ready', phase: 'fetch', activeAddress: null,
    input: [], output: [], steps: 0, rng: seedValue(seed), extended, lastBranchTaken:false,
    message: 'Program ready. Select Run or Step.' };
}
const wrap = (value: number) => ((value % 10000) + 10000) % 10000;
const fault = (m: Machine, msg: string): Machine => ({ ...m, status:'error', error: msg, message: msg });
/** Pure microstep transition; never mutates its input state. */
export function microstep(state: Machine): Machine {
  if (state.status === 'halted' || state.status === 'error') return state;
  const m: Machine = { ...state, memory: [...state.memory], kinds: [...state.kinds], input: [...state.input], output: [...state.output], status: 'ready' };
  if (m.phase === 'fetch') {
    if (m.pc >= Math.min(m.memory.length, 100) || m.pc < 0) return fault(m, m.pc >= 100 ? `Program Counter ${m.pc} is not addressable by the four-digit OOAA format (00–99).` : `Program Counter ${m.pc} is outside RAM.`);
    m.lastBranchTaken = false;
    m.activeAddress = m.pc;
    m.mar = m.pc;
    m.ir = m.memory[m.pc];
    m.phase = 'decode';
    m.message = `FETCH · Reading memory address ${addressLabel(m.mar)}.`;
    return m;
  }
  const inst = decode(m.ir);
  if (m.phase === 'decode') {
    if (!inst.valid) return fault(m, `Unknown instruction ${word(m.ir)} at memory address ${addressLabel(m.activeAddress ?? 0)}.`);
    m.mar = inst.operand ?? m.mar;
    m.phase = 'execute';
    m.message = `DECODE · ${word(m.ir)} → ${inst.mnemonic}${inst.operand === null ? '' : ` ${addressLabel(inst.operand)}`}.`;
    return m;
  }
  const address = inst.operand ?? 0;
  if (['ADD','SUB','STA','LDA','BRA','BRZ','BRP'].includes(inst.mnemonic) && address >= m.memory.length) return fault(m, `Instruction references memory address ${addressLabel(address)}, beyond configured RAM.`);
  let branched = false;
  switch (inst.mnemonic) {
    case 'HLT': m.status = 'halted'; m.message = 'HLT · Program halted.'; break;
    case 'INP':
      if (m.input.length === 0) { m.status = 'waiting'; m.message = 'INP · Enter a number to continue.'; return m; }
      m.acc = m.input.shift()!; m.negative = false;
      m.message = `INP · Loaded ${word(m.acc)} into the Accumulator.`; break;
    case 'OUT': m.output.push({ type: 'number', value: m.acc }); m.message = `OUT · Displayed ${m.acc}.`; break;
    case 'OUTC': m.output.push({ type: 'character', value: m.acc }); m.message = `OUTC · Displayed the character for ASCII ${m.acc}.`; break;
    case 'RND': {
      const r = nextRandom(m.rng); m.rng = r.seed; m.acc = r.value; m.negative = false;
      m.message = `RND · Generated ${word(r.value)}.`; break;
    }
    case 'LDI': m.acc = address; m.negative = false; m.message = `LDI · Loaded ${word(address)} into the Accumulator.`; break;
    case 'LDA': m.acc = m.memory[address]; m.negative = false; m.message = `LDA · Loaded ${word(m.acc)} from address ${addressLabel(address)}.`; break;
    case 'STA': m.memory[address] = m.acc; if (m.kinds[address] !== 'dat') m.kinds[address] = 'data'; m.message = `STA · Stored ${word(m.acc)} at address ${addressLabel(address)}.`; break;
    case 'ADD': { const raw = m.acc + m.memory[address]; m.acc = wrap(raw); m.negative = raw < 0; m.message = `ADD · Result: ${word(m.acc)}${raw > 9999 ? ' (wrapped to 0000–9999)' : ''}.`; break; }
    case 'SUB': { const raw = m.acc - m.memory[address]; m.acc = wrap(raw); m.negative = raw < 0; m.message = `SUB · Result: ${word(m.acc)}${raw < 0 ? ' (borrow flag set)' : ''}.`; break; }
    case 'BRA': m.pc = address; branched = true; m.message = `BRA · Jump to address ${addressLabel(address)}.`; break;
    case 'BRZ': if (m.acc === 0) { m.pc = address; branched = true; } m.message = `BRZ · ${m.acc === 0 ? `Zero. Jump to address ${addressLabel(address)}.` : 'Not zero. Continue.'}`; break;
    case 'BRP': if (!m.negative) { m.pc = address; branched = true; } m.message = `BRP · ${!m.negative ? `Nonnegative. Jump to address ${addressLabel(address)}.` : 'Negative. Continue.'}`; break;
    default: return fault(m, `Unknown instruction ${word(m.ir)}.`);
  }
  // Sequential instructions increment PC after execution. Taken branches replace PC; HLT does not advance it.
  // The animated UI shows this as PC → Arithmetic Unit (+1) → PC.
  m.lastBranchTaken = branched;
  if (!branched && m.status !== 'halted') m.pc += 1;
  m.steps += 1;
  m.phase = 'fetch';
  return m;
}
/** Execute exactly one instruction (three microsteps); stops early for input or an error. */
export function stepInstruction(state: Machine): Machine {
  let m = state;
  if (m.status === 'waiting' && m.input.length === 0) return m;
  for (let n = 0; n < 3; n++) {
    m = microstep(m);
    if (m.phase === 'fetch' || m.status === 'waiting' || m.status === 'error' || m.status === 'halted') break;
  }
  return m;
}
export function enqueueInput(state: Machine, input: number): Machine {
  if (!Number.isInteger(input) || input < 0 || input > 9999) return state;
  return { ...state, input: [...state.input, input], status: state.status === 'waiting' ? 'ready' : state.status, message: `Input ${word(input)} queued.` };
}
export function outputText(output: OutputToken[]): string {
  return output.map(o => {
    if (o.type === 'number') return `${o.value}\n`;
    if (o.value === 10) return '\n';
    if (o.value === 9) return '\t';
    return o.value >= 32 && o.value <= 126 ? String.fromCharCode(o.value) : `[ASCII ${o.value}]`;
  }).join('');
}
/** Synchronous runner for test cases (not the UI animation loop). */
export function runToCompletion(asm: AssemblyResult, inputs: number[], seed = 12345, maxInstructions = 10000, extended = true): Machine {
  let m: Machine = { ...createMachine(asm, seed, extended), input: [...inputs] };
  while (m.status !== 'halted' && m.status !== 'error' && m.status !== 'waiting' && m.steps < maxInstructions) {
    m = stepInstruction(m);
  }
  if (m.steps >= maxInstructions && m.status !== 'halted') m = fault(m, `Execution limit of ${maxInstructions} instructions exceeded (possible infinite loop).`);
  return m;
}
