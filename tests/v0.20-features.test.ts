import {describe,it,expect} from 'vitest';
import {branchDots,branchHoldBudgetMs,BRANCH_THINK_MS,BRANCH_RESULT_MS} from '../src/core/animationTiming';
import {advanceAnimationClock,MIN_VELOCITY,MAX_VELOCITY,DEFAULT_VELOCITY,BASE_VELOCITY} from '../src/core/liveSpeed';
import {assemble} from '../src/core/assembler';
import {createMachine,microstep} from '../src/core/machine';
import {transferPlan} from '../src/core/flowModel';

describe('VonBot 0.20 execution presentation',()=>{
  it('shows two full dot cycles before revealing the result',()=>{
    expect(BRANCH_THINK_MS).toBe(2000);
    expect(BRANCH_RESULT_MS).toBe(1000);
    for(let frame=0;frame<6;frame++)
      expect(branchDots(frame/9)).toBe('.'.repeat(frame%3+1));
    expect(branchDots(2/3)).toBeNull();
    expect(branchDots(1)).toBeNull();
  });
  it('scales a three-second check with live rail speed',()=>{
    const hold=branchHoldBudgetMs();
    const realTime=(velocity:number)=>hold*BASE_VELOCITY/velocity;
    expect(realTime(DEFAULT_VELOCITY)).toBe(3000);
    expect(realTime(MIN_VELOCITY)).toBe(6000);
    expect(realTime(MAX_VELOCITY)).toBeLessThan(500);
    expect(advanceAnimationClock(100,100,MIN_VELOCITY))
      .toBeLessThan(advanceAnimationClock(100,100,MAX_VELOCITY));
  });
  it('keeps BRZ Accumulator-to-ALU followed by branch destination transfer',()=>{
    let machine=createMachine(assemble('LDI 0\nBRZ END\nOUT\nEND HLT',16));
    for(let i=0;i<3;i++)machine=microstep(machine);
    const fetched=microstep(machine), decoded=microstep(fetched), executed=microstep(decoded);
    const transfers=transferPlan(executed,decoded);
    expect(executed.lastBranchTaken).toBe(true);
    expect(transfers.find(t=>t.from==='acc'&&t.to==='alu')).toBeDefined();
    expect(transfers.find(t=>t.from==='alu'&&t.to==='pc')).toBeDefined();
  });
});
