import {addressLabel} from './assembler';
export type BranchOp='BRA'|'BRZ'|'BRP';
export type BranchDecision={operation:BranchOp; checking:string; success:boolean; result:string};
/** BRP uses the simulator's borrow/negative flag, not the wrapped ACC value. */
export function branchDecision(operation:BranchOp,acc:number,negative:boolean,address:number):BranchDecision {
 if(operation==='BRA')return {operation,checking:'Branch to a new address.',success:true,result:`Jump to address ${addressLabel(address)}.`};
 if(operation==='BRZ')return {operation,checking:'Checking if the Accumulator is zero…',success:acc===0,result:acc===0?`Zero! Jump to address ${addressLabel(address)}.`:'Not zero. Continue to the next instruction.'};
 return {operation,checking:'Checking the negative flag…',success:!negative,result:!negative?`Nonnegative! Jump to address ${addressLabel(address)}.`:'Negative. Continue to the next instruction.'};
}
