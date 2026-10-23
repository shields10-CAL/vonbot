/** LMC assembler. Memory is decimal (not binary) and shared by code and data. */
export type CellKind = 'instruction' | 'data' | 'dat' | 'empty';
export type Diagnostic = { line: number; message: string };
export type InstructionName = 'ADD' | 'SUB' | 'STA' | 'LDI' | 'LDA' | 'BRA' | 'BRZ' | 'BRP' | 'INP' | 'OUT' | 'OUTC' | 'RND' | 'HLT' | 'DAT';
export type AssemblyEntry = { address: number; line: number; source: string; op: InstructionName; operand: string; label?: string };
export type AssemblyResult = {
  memory: number[]; kinds: CellKind[]; addressToLine: (number | null)[];
  lineToAddress: Record<number, number>; entries: AssemblyEntry[];
  diagnostics: Diagnostic[]; warnings: Diagnostic[]; symbols: Record<string, number>;
};
const ALIASES: Record<string, InstructionName> = { STO: 'STA', OTC: 'OUTC', COB: 'HLT' };
const OPS = new Set<InstructionName>(['ADD','SUB','STA','LDI','LDA','BRA','BRZ','BRP','INP','OUT','OUTC','RND','HLT','DAT']);
const ARG_OPS = new Set<InstructionName>(['ADD','SUB','STA','LDI','LDA','BRA','BRZ','BRP']);
const NO_ARG = new Set<InstructionName>(['INP','OUT','OUTC','RND','HLT']);
/** LMC 2.0 only: four decimal digits OOAA (two-digit opcode, two-digit operand). */
export const OPCODE_IDS = {
  HLT: 0, ADD: 1, SUB: 2, STA: 3, LDA: 4, BRA: 5,
  BRZ: 6, BRP: 7, LDI: 8, RND: 9, INP: 10, OUT: 11, OUTC: 12,
} as const;
export const OPCODE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(OPCODE_IDS).map(([name, id]) => [id, name]),
);
export const WORD_MAX = 9999;
export const WORD_BASE = 10000;
export const OPCODES = ['INP','OUT','OUTC','RND','LDA','STA','LDI','ADD','SUB','BRA','BRZ','BRP','HLT','DAT'] as const;
export const CLASSIC_OPS = new Set(['INP','OUT','LDA','STA','ADD','SUB','BRA','BRZ','BRP','HLT','DAT']);
const NAME = /^[A-Za-z_][\w]*$/;
const OP_NAME = (v: string) => ALIASES[v.toUpperCase()] ?? v.toUpperCase();
const parseNumber = (value: string): number | null => /^[+-]?\d+$/.test(value.trim()) ? Number(value.trim()) : null;

export function assemble(source: string, size = 100, _extended = true): AssemblyResult {
  const memory = Array(size).fill(0) as number[];
  const kinds = Array(size).fill('empty') as CellKind[];
  const addressToLine = Array(size).fill(null) as (number | null)[];
  const lineToAddress: Record<number, number> = {};
  const symbols: Record<string, number> = {};
  const diagnostics: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const entries: AssemblyEntry[] = [];
  let address = 0;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  lines.forEach((raw, index) => {
    const line = index + 1;
    const withoutComment = raw.split(/;|\/\//)[0].trim();
    if (!withoutComment) return;
    const tokens = withoutComment.split(/\s+/).filter(Boolean);
    let label: string | undefined;
    if (tokens[0].endsWith(':')) {
      label = tokens.shift()!.slice(0, -1).toUpperCase();
    } else if (tokens.length > 1 && !OPS.has(OP_NAME(tokens[0]) as InstructionName) && tokens[0].toUpperCase() !== '.ORG') {
      const first = tokens.shift()!;
      if (/^\d+$/.test(first)) {
        const absolute = Number(first);
        if (absolute < address) diagnostics.push({ line, message: `Address ${absolute} overlaps earlier code or data.` });
        address = absolute;
      } else label = first.toUpperCase();
    }
    if (label) {
      if (!NAME.test(label)) diagnostics.push({ line, message: `Invalid label '${label}'.` });
      else if (Object.prototype.hasOwnProperty.call(symbols, label)) diagnostics.push({ line, message: `Duplicate label '${label}'.` });
      else symbols[label] = address;
    }
    if (!tokens.length) return;
    if (tokens[0].toUpperCase() === '.ORG') {
      const newAddress = parseNumber(tokens[1] ?? '');
      if (tokens.length !== 2 || newAddress === null || newAddress < 0 || newAddress >= size) {
        diagnostics.push({ line, message: `.ORG requires an address between 0 and ${size - 1}.` });
      } else if (newAddress < address) diagnostics.push({ line, message: `.ORG cannot move backwards into existing memory.` });
      else address = newAddress;
      return;
    }
    const op = OP_NAME(tokens.shift()!);
    if (!OPS.has(op as InstructionName)) {
      diagnostics.push({ line, message: `Unknown instruction '${op}'.` }); return;
    }
    const inst = op as InstructionName;
    // The four-digit LMC 2.0 encoding always supports the complete instruction set.
    const operand = tokens.join(' ').toUpperCase();
    if (tokens.length > 1) diagnostics.push({ line, message: `Too many operands for ${inst}.` });
    if (ARG_OPS.has(inst) && !operand) diagnostics.push({ line, message: `${inst} requires an operand.` });
    if (NO_ARG.has(inst) && operand) diagnostics.push({ line, message: `${inst} does not take an operand.` });
    if (address >= size || address < 0 || address >= 100) diagnostics.push({ line, message: address >= 100 ? `Address ${address} cannot contain source code: the four-digit OOAA instruction format addresses only 00–99. Addresses 100–127 are display-only in the experimental 128-address view.` : `Program exceeds ${size} memory cells.` });
    else {
      if (addressToLine[address] !== null) diagnostics.push({ line, message: `Memory address ${address} already occupied.` });
      entries.push({ address, line, source: raw, op: inst, operand, label });
      addressToLine[address] = line;
      lineToAddress[line] = address;
      kinds[address] = inst === 'DAT' ? 'dat' : 'instruction';
    }
    address += 1;
  });
  for (const entry of entries) {
    const { line, op, operand, address: cell } = entry;
    const value = operand in symbols ? symbols[operand] : parseNumber(operand);
    if (op === 'DAT') {
      const data = operand ? value : 0;
      if (data === null || data < 0 || data > WORD_MAX || !Number.isInteger(data)) {
        diagnostics.push({ line, message: 'DAT requires a decimal value from 0000 through 9999, or a label.' });
      } else memory[cell] = data;
    } else if (ARG_OPS.has(op)) {
      if (value === null || !Number.isInteger(value) || value < 0 || value > 99 || (op !== 'LDI' && value >= size)) {
        diagnostics.push({ line, message: `${op} requires ${op === 'LDI' ? 'a literal 0–99' : `a valid label or memory address 0–${size - 1}`}; received '${operand}'.` });
      } else memory[cell] = OPCODE_IDS[op as keyof typeof OPCODE_IDS] * 100 + value;
    } else memory[cell] = OPCODE_IDS[op as keyof typeof OPCODE_IDS] * 100;
  }
  // Control-flow-aware DAT warning: sequentially scan reachable commands from
  // address 00. Never warn for data after HLT, BRA or other unreachable data.
  // For conditional branches, conservatively visit BOTH the branch and fallthrough.
  // Treat data as terminal (the CPU may interpret its word as machine code at
  // runtime, but the assembler cannot generally predict intentional data execution).
  const byAddress = new Map(entries.map(e => [e.address, e]));
  const visited = new Set<number>();
  const queue = [0];
  while (queue.length) {
    const current = queue.shift()!;
    if (current < 0 || current >= size || visited.has(current)) continue;
    visited.add(current);
    const entry = byAddress.get(current);
    if (!entry) continue;
    if (entry.op === 'DAT') {
      warnings.push({line:entry.line,message:`Execution may reach DAT at address ${addressLabel(entry.address)}. Add HLT or a branch before data unless executing data is intentional.`});
      continue;
    }
    if (entry.op === 'HLT') continue;
    const operand = entry.operand in symbols ? symbols[entry.operand] : parseNumber(entry.operand);
    if (entry.op === 'BRA') { if (operand !== null) queue.push(operand); continue; }
    if ((entry.op === 'BRZ' || entry.op === 'BRP') && operand !== null) queue.push(operand);
    queue.push(current + 1);
  }
  // A numeric address may point at executable code instead of a data
  // declaration. That's legal, but beginners commonly mean SUB COUNT rather
  // than SUB 0 (which subtracts the encoded instruction at address 00).
  for (const entry of entries) {
    if (entry.op !== 'ADD' && entry.op !== 'SUB') continue;
    const target = entry.operand in symbols ? symbols[entry.operand] : parseNumber(entry.operand);
    if (target !== null && target >= 0 && target < size && kinds[target] === 'instruction') {
      const targetEntry = byAddress.get(target);
      warnings.push({line:entry.line,message:`${entry.op} reads executable ${targetEntry?.op ?? 'code'} at address ${addressLabel(target)} as the number ${word(memory[target])}. If you meant to change a counter, use a labeled DAT value (for example, SUB COUNTER).`});
    }
  }
  // Source-level self-modifying-code diagnostics. STA addresses assembled as
  // instructions are valid on a Von Neumann machine, but dangerous for beginners.
  // Preserve the program and report a NON-BLOCKING warning instead of an error.
  for(const entry of entries){
    if(entry.op!=='STA')continue;
    const target=entry.operand in symbols?symbols[entry.operand]:parseNumber(entry.operand);
    if(target!==null&&target>=0&&target<size&&kinds[target]==='instruction'){
      warnings.push({line:entry.line,message:`STA will overwrite executable instruction at memory address ${addressLabel(target)} (source line ${addressToLine[target]}). Use a DAT declaration for storage unless self-modifying code is intentional.`});
    }
  }
  return { memory, kinds, addressToLine, lineToAddress, entries, diagnostics, warnings, symbols };
}

export function decode(value: number): { mnemonic: string; operand: number | null; valid: boolean } {
  if (!Number.isInteger(value) || value < 0 || value > WORD_MAX) return {mnemonic:'???',operand:null,valid:false};
  const opcode = Math.floor(value / 100);
  const mnemonic = OPCODE_NAMES[opcode];
  if (!mnemonic) return {mnemonic:'???',operand:null,valid:false};
  const operand = value % 100;
  const withOperand = ['ADD','SUB','STA','LDA','BRA','BRZ','BRP','LDI'].includes(mnemonic);
  // HLT uses only its opcode. Data such as DAT 20 (0020) may decode as HLT
  // when execution falls into it; no special hardware distinction exists between data and code.
  // Other operand-free instructions retain strict encoding to catch malformed words.
  if (!withOperand && operand !== 0 && mnemonic !== 'HLT') return {mnemonic:'???',operand:null,valid:false};
  return {mnemonic,operand:withOperand ? operand : null, valid:true};
}
export const word = (n: number) => String(n).padStart(4, '0');
export const addressLabel = (n: number) => String(n).padStart(2, '0');
