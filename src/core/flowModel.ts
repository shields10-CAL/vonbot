import {addressLabel,decode,word} from './assembler';
import type {Machine} from './machine';
export type VisiblePhase='READY'|'FETCH'|'DECODE'|'EXECUTE';
export function visiblePhase(m:Machine):VisiblePhase{
  if(m.activeAddress===null)return 'READY';
  if(m.status==='waiting')return 'EXECUTE';
  if(m.phase==='decode')return 'FETCH';
  if(m.phase==='execute')return 'DECODE';
  return 'EXECUTE';
}
export type FlowTransfer={from:string;to:string;value:string;start:number;length:number};
type Point={x:number;y:number};
/** Each operation is described in terms of actual source and destination units.
 *  This function is pure so CPU flow can be regression-tested without a browser. */
export function transferPlan(m: Machine, previous?: Machine): FlowTransfer[] {
  if (m.activeAddress === null) return [];
  const phase = visiblePhase(m), inst = decode(m.ir), op = inst.mnemonic;
  const old = previous ?? m;
  if (phase === 'FETCH') return [
    { from:'pc', to:'control', value:addressLabel(m.activeAddress), start:.01, length:.19 },
    { from:'control', to:'memoryInstruction', value:addressLabel(m.activeAddress), start:.23, length:.34 },
    { from:'memoryInstruction', to:'decodeInbox', value:word(m.ir), start:.62, length:.35 },
  ];
  if (phase === 'DECODE') return [
    { from:'decodeInbox', to:'decodeJunction', value:word(m.ir), start:.02, length:.24 },
    { from:'decodeJunction', to:'ir', value:word(m.ir).slice(0,2), start:.30, length:.32 },
    { from:'decodeJunction', to:'ar', value:word(m.ir).slice(2), start:.30, length:.32 },
  ];
  // On an input request, the command arrives at Execute and remains lit while
  // the CPU waits. When input later arrives, do not re-send that same command.
  if(m.status==='waiting')return [{from:'decode',to:'executeInbox',value:inst.mnemonic,start:.01,length:.18}];
  const resumedInput=previous?.status==='waiting';
  const moves: FlowTransfer[] = resumedInput?[]:[
    { from:'decode', to:'executeInbox', value:inst.mnemonic, start:.01, length:.16 },
  ];
  const add = (from:string,to:string,value:string,start:number,length:number) => moves.push({from,to,value,start,length});
  if (op === 'INP') add('input','acc',word(m.acc),.23,.36);
  if (op === 'OUT' || op === 'OUTC') add('acc','output',word(m.acc),.23,.36);
  if (op === 'LDA') add('memoryOperand','acc',word(m.acc),.23,.36);
  if (op === 'STA') add('acc','memoryOperand',word(m.acc),.23,.36);
  if (op === 'ADD' || op === 'SUB') {
    add('memoryOperand','alu',word(m.memory[inst.operand ?? 0]),.24,.25);
    add('acc','alu',word(old.acc),.24,.25);
    add('alu','acc',word(m.acc),.54,.20);
  }
  if (op === 'LDI') add('decode','acc',word(m.acc),.23,.36);
  if (op === 'RND') add('alu','acc',word(m.acc),.23,.36);
  if (op === 'BRZ' || op === 'BRP') {
    // Visually inspect the Accumulator/flag in the Arithmetic Unit before
    // revealing whether a conditional branch is taken.
    add('acc','alu',word(old.acc),.28,.27);
  }
  if (m.lastBranchTaken) {
    // Branch target must pass through the Arithmetic Unit before reaching PC.
    add('decode','alu',addressLabel(m.pc),.77,.11);
    add('alu','pc',addressLabel(m.pc),.91,.08);
  }
  else if (m.status !== 'halted') {
    // The PC +1 operation occupies almost HALF of Execute.
    // Students can watch +1 visit the ALU, then the new address return to PC.
    // The OLD counter travels to the Arithmetic Unit; the incremented
    // address travels back. Never imply the PC performs its own math.
    add('pc','alu',addressLabel(old.pc),.79,.12);
    add('alu','pc',addressLabel(m.pc),.93,.065);
  }
  return moves;
}

/** Sample the orthogonal rail directly from its SVG M/H/V coordinates.
 *  No SVGPathElement refs or browser-specific SMIL timing are required. */
export function pointOnRail(d:string,amount:number):Point {
  const points:Point[]=[];let x=0,y=0;
  const commands=d.match(/[MHV]-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)?/g)??[];
  for(const command of commands){
    if(command[0]==='M'){const parts=command.slice(1).split(',').map(Number);x=parts[0];y=parts[1];}
    if(command[0]==='H')x=Number(command.slice(1));
    if(command[0]==='V')y=Number(command.slice(1));
    points.push({x,y});
  }
  if(points.length===0)return {x:0,y:0};
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((a,b)=>a+b,0);let remaining=Math.max(0,Math.min(1,amount))*total;
  for(let i=0;i<lengths.length;i++){
    const len=lengths[i];
    if(remaining<=len||i===lengths.length-1){const t=len?remaining/len:1;return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}
    remaining-=len;
  }
  return points[0];
}
