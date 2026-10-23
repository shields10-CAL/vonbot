/** Format VonBot assembly while preserving labels, operands, comments and order.
 * Layout: label column, mnemonic column, operand, and optional comment.
 * This changes whitespace only; source lines and branch targets are unchanged.
 */
const OPCODES = new Set(['ADD','SUB','STA','STO','LDI','LDA','BRA','BRZ','BRP','INP','OUT','OUTC','OTC','RND','HLT','DAT','COB','.ORG']);
export function formatAssembly(source: string): string {
  return source.split(/\r?\n/).map(line => {
    if (!line.trim()) return '';
    if (/^\s*(;|\/\/)/.test(line)) return line.trimStart();
    const match = line.match(/^(.*?)(\s*(?:;|\/\/).*?)?\s*$/);
    if (!match) return line;
    const code = (match[1] || '').trim();
    const comment = (match[2] || '').trim();
    const parts = code.split(/\s+/).filter(Boolean);
    if (!parts.length) return comment;
    let label = '';
    if (parts[0].endsWith(':') || (parts.length>1 && !OPCODES.has(parts[0].toUpperCase()))) label = parts.shift()!;
    const opcode = parts.shift()?.toUpperCase() ?? '';
    const operand = parts.join(' ');
    if (!opcode) return [label,comment].filter(Boolean).join(' ');
    const assembled = `${label.padEnd(10)}${opcode.padEnd(7)}${operand}`.trimEnd();
    return comment ? `${assembled}  ${comment}` : assembled;
  }).join('\n');
}
