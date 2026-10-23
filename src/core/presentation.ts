import type { Machine } from './machine';
/** Hold register and memory values at the prior state until the corresponding
 *  data token physically reaches its destination. The CPU model itself is
 *  always authoritative and is never modified by presentation. */
export function presentationMachine(next:Machine,previous:Machine,arrived:string[]):Machine {
  const seen=(node:string)=>arrived.includes(node);
  return {...next,
    pc:seen('pc')?next.pc:previous.pc,
    acc:seen('acc')?next.acc:previous.acc,
    memory:seen('memoryOperand')?next.memory:previous.memory,
    output:seen('output')?next.output:previous.output,
    // A waiting-input spotlight and the red Halt state must not appear
    // before the decoded command finishes traveling into Execute.
    status:seen('complete')?next.status:
      (next.status==='waiting'||next.status==='halted'?previous.status:next.status),
  };
}
