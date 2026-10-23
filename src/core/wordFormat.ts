import { word } from './assembler';
export type NumberDisplay = 'decimal' | 'binary';
/** Two decimal digits per field; each 00–99 field fits in seven bits. */
export function splitWordParts(value:number,mode:NumberDisplay):[string,string]{
  const padded=word(value);
  const opcode=Number(padded.slice(0,2)),operand=Number(padded.slice(2));
  return mode==='binary'?[opcode.toString(2).padStart(7,'0'),operand.toString(2).padStart(7,'0')]:[padded.slice(0,2),padded.slice(2)];
}
