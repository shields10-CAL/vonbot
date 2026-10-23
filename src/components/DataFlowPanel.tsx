import { Box, Card, Chip, Stack, Typography, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import AluPopupPortal from './AluPopupPortal';
import { CalculateOutlined, DataObjectOutlined, EastOutlined, NumbersOutlined, PlayArrowRounded, StorageOutlined, AlternateEmail, DownloadOutlined, AccountTreeOutlined } from '@mui/icons-material';
import { addressLabel, decode, word } from '../core/assembler';
import type { Machine } from '../core/machine';
import type { FlowTransition } from './FlowRails';
import ComputerPanel from './ComputerPanel';
import { EncodedWord } from './MemoryPanel';
import { splitWordParts } from '../core/wordFormat';
import type { NumberDisplay } from '../core/wordFormat';

import { visiblePhase } from '../core/flowModel';
import { branchDecision } from '../core/branchDecision';
import { branchDots } from '../core/animationTiming';
export { visiblePhase } from '../core/flowModel';
export const addressCommands = new Set(['ADD', 'SUB', 'STA', 'LDA', 'BRA', 'BRZ', 'BRP']);
export function decodeExplanation(m:Machine): string {
  if(m.activeAddress===null)return 'The opcode identifies the command; the operand identifies an address or value.';
  const inst=decode(m.ir), operand=inst.operand;
  const address=operand===null?'':`address ${addressLabel(operand)}`;
  switch(inst.mnemonic){
    case 'ADD':return `Add the value at ${address} to the Accumulator.`;
    case 'SUB':return `Subtract the value at ${address} from the Accumulator.`;
    case 'STA':return `Store the Accumulator at ${address}.`;
    case 'LDA':return `Load the value at ${address} into the Accumulator.`;
    case 'INP':return 'Read a number into the Accumulator.';
    case 'OUT':return 'Display the Accumulator as a number.';
    case 'OUTC':return 'Display the ASCII character in the Accumulator.';
    case 'RND':return 'Generate a random number (0–99).';
    case 'LDI':return `Load the number ${operand} into the Accumulator.`;
    case 'BRA':return `Jump to ${address}.`;
    case 'BRZ':return `Jump to ${address} if the Accumulator is zero.`;
    case 'BRP':return `Jump to ${address} if the negative flag is clear.`;
    case 'HLT':return 'Stop the program.';
    default:return `Unknown instruction ${word(m.ir)}.`;
  }
}
export function executionExplanation(m:Machine): string {
  if (m.activeAddress===null) return 'Execute carries out the decoded command.';
  if (m.status==='waiting') return 'Waiting for a number. Enter a value to continue.';
  if (visiblePhase(m)==='EXECUTE') return m.message.replace(/^EXECUTE\s*·\s*/,'');
  return decodeExplanation(m);
}

const PHASES=[{title:'FETCH',sub:'Retrieve instruction',tone:'fetch'},{title:'DECODE',sub:'Interpret instruction',tone:'decode'},{title:'EXECUTE',sub:'Carry out instruction',tone:'execute'}] as const;
export default function DataFlowPanel({machine,running,sendInput,clearOutput,revealed=[],displayMode,resumedInput=false,cycleComplete=false,randomAnimationId=null,motion=null,paused=false,branchCheckProgress=null}:{machine:Machine;motion?:FlowTransition|null;running:boolean;sendInput:(n:number)=>void;clearOutput:()=>void;revealed?:string[];displayMode:NumberDisplay;resumedInput?:boolean;cycleComplete?:boolean;randomAnimationId?:number|null;paused?:boolean;branchCheckProgress?:number|null}){
  const [scramble,setScramble]=useState<number|null>(null);
  const [randomFinished,setRandomFinished]=useState(false);
  const pausedRef=useRef(paused);pausedRef.current=paused;
  const randomActive=randomAnimationId!==null&&revealed.includes('executeInbox')&&!revealed.includes('acc');
  useEffect(()=>{
    if(!randomActive){setScramble(null);return;}
    setRandomFinished(false);
    let activeMs=0;const tickMs=65;
    const timer=window.setInterval(()=>{
      if(pausedRef.current)return;
      activeMs+=tickMs;
      if(activeMs>=1000){window.clearInterval(timer);setScramble(null);setRandomFinished(true);}
      else setScramble(Math.floor(Math.random()*10000));
    },tickMs);
    return()=>window.clearInterval(timer);
  },[randomAnimationId,randomActive]);
  const current=visiblePhase(machine);const inst=decode(machine.ir);
  const phaseForHighlight=current==='READY'?'FETCH':current;
  const finished=cycleComplete&&machine.status==='ready';
  const halted=machine.status==='halted' && revealed.includes('complete');
  const aluOp=decode(motion?.next.ir ?? machine.ir).mnemonic;
  const oldAcc=motion?.previous.acc ?? machine.acc;
  const operand=decode(motion?.next.ir ?? machine.ir).operand ?? 0;
  const dataValue=(motion?.previous.memory[operand] ?? machine.memory[operand] ?? 0);
  const arithmeticResult=motion?.next.acc ?? machine.acc;
  const pcTravelling=current==='EXECUTE'&&!finished&&!halted&&!revealed.includes('complete')&&
    (revealed.includes('pcDepart')||revealed.includes('pcAlu'))&&!revealed.includes('pc');
  const pcMathReady=pcTravelling && !(motion?.next.lastBranchTaken);
  const arithmeticReady=current==='EXECUTE'&&revealed.includes('aluReady');
  const executeCommandArrived=current==='EXECUTE'&&revealed.includes('executeInbox');
  const pcUpdateStarted=['pcDepart','pcAlu','pc','pcTransferStarted'].some(x=>revealed.includes(x));
  const showingArithmetic=executeCommandArrived&&!finished&&!halted&&!revealed.includes('complete')&&(aluOp==='ADD'||aluOp==='SUB')&&!pcUpdateStarted;
  const showingRandom=executeCommandArrived&&!finished&&!halted&&!revealed.includes('complete')&&aluOp==='RND'&&!pcUpdateStarted&&!revealed.includes('acc');
  const showingPcBranch=current==='EXECUTE'&&!finished&&!halted&&!revealed.includes('complete')&&!!motion?.next.lastBranchTaken&&revealed.includes('pcTransferStarted')&&!revealed.includes('pc');
  const slot=(value:string,kind='')=><span className={`alu-value-slot ${kind}`}>{value}</span>;
  const mathFormula=pcMathReady ? <>
    {slot(revealed.includes('pcAlu')?addressLabel(motion?.previous.pc ?? machine.pc):'··','value-pc')}
    <span className="alu-operator">+</span>{slot('1','constant')}
    <span className="alu-operator">=</span>{slot(revealed.includes('pcAlu')?addressLabel(motion?.next.pc ?? machine.pc):'··','value-result')}
  </> : showingArithmetic ? <>
    {slot(revealed.includes('aluAccumulator')?word(oldAcc):'····','value-acc')}
    <span className="alu-operator">{aluOp==='ADD'?'+':'−'}</span>
    {slot(revealed.includes('aluMemory')?word(dataValue):'····','value-memory')}
    <span className="alu-operator">=</span>
    {slot(arithmeticReady?word(arithmeticResult):'····','value-result')}
  </> : null;
  const randomText=showingRandom ? (scramble!==null?word(scramble):randomFinished?word(arithmeticResult):'????') : null;
  const branchOp=(['BRA','BRZ','BRP'].includes(aluOp)?aluOp:null) as 'BRA'|'BRZ'|'BRP'|null;
  const branch=branchOp?branchDecision(branchOp,oldAcc,motion?.previous.negative ?? machine.negative,operand):null;
  const branchOperandArrived=revealed.includes('aluAccumulator');
  const checkingBranch=current==='EXECUTE'&&branch!==null&&branchOp!=='BRA'&&branchOperandArrived&&!revealed.includes('aluReady');
  const branchChecked=current==='EXECUTE'&&branch!==null&&(branchOp==='BRA'?revealed.includes('executeInbox'):revealed.includes('aluReady'));
  const dots=branchCheckProgress===null?'.':branchDots(branchCheckProgress);
  const branchFormula=branchOp==='BRZ' ? <>
    {slot(revealed.includes('aluAccumulator')?word(oldAcc):'····','value-acc')}<span className="alu-operator">==</span>{slot('0000','constant')}<span className="alu-operator">=</span>{slot(branchChecked?(branch?.success?'TRUE':'FALSE'):(dots??'...'),branchChecked?(branch?.success?'comparison-true':'comparison-false'):'')}
  </> : branchOp==='BRP' ? <>
    <span className="alu-comparison-label">Borrow</span>{slot(revealed.includes('aluAccumulator')?(motion?.previous.negative?'1':'0'):'·','value-acc')}<span className="alu-operator">==</span>{slot('0','constant')}<span className="alu-operator">=</span>{slot(branchChecked?(branch?.success?'TRUE':'FALSE'):(dots??'...'),branchChecked?(branch?.success?'comparison-true':'comparison-false'):'')}
  </> : null;
  const aluFormula=(!finished&&!halted&&!revealed.includes('complete')) ? (mathFormula ?? (!revealed.includes('pc')&&(branchOperandArrived&&(branchChecked||checkingBranch)) ? branchFormula : null)) : null;
  const updateDescription=pcTravelling?'Updating Program Counter…':null;
  const instructionOutcome=branchChecked?branch?.result:
    checkingBranch?branch?.checking:
    (motion?.next.message ?? machine.message).replace(/^[A-Z]+\s*·\s*/, '');
  const code=machine.activeAddress===null?'----':word(machine.ir);
  const decoding=current==='DECODE'||current==='EXECUTE';
  const fetchedLoaded=machine.activeAddress!==null&&(decoding||revealed.includes('decodeInbox'));
  const commandLoaded=machine.activeAddress!==null&&current==='EXECUTE'&&(revealed.includes('executeInbox')||resumedInput);
  const irVisible=decoding&&(current==='EXECUTE'||revealed.includes('ir'));
  const arVisible=decoding&&(current==='EXECUTE'||revealed.includes('ar'));
  const irPart=irVisible?splitWordParts(machine.ir,displayMode)[0]:'--';
  const arPart=arVisible?splitWordParts(machine.ir,displayMode)[1]:'--';
  const spokenState = halted ? 'Program halted.' : finished ? 'Cycle complete. Step to fetch the next instruction.' :
    current==='FETCH' ? `Fetch: reading instruction from memory address ${addressLabel(machine.activeAddress ?? machine.pc)}.` :
    current==='DECODE' ? `Decode: ${irVisible && arVisible ? `${inst.mnemonic}. ${decodeExplanation(machine)}` : 'splitting instruction into opcode and operand'}.` :
    `Execute: ${machine.status==='waiting' ? 'Input required.' : executionExplanation(machine)}`;
  return <Box className={`teaching-flow ${halted?'is-halted':''}`} role="region" aria-label="Fetch, Decode, Execute CPU visualization">
    <Box className="sr-only" role="status" aria-live="polite" aria-atomic="true">{spokenState}</Box>
    {(finished||halted)?<Box className={`cycle-status-banner ${halted?'halted':'completed'}`} role="status">{halted?'Program has been halted':'Cycle complete, step forward for next instruction'}</Box> :
    <Box className={`stage-tabs`} role="group" aria-label="Execution phases">
      {PHASES.map((p,i)=><Box key={p.title} className={`stage-tab stage-${p.tone} ${!finished&&phaseForHighlight===p.title?'is-active':'is-muted'}`}>
        <Box className="stage-step">{i+1}</Box><Box minWidth={0}><Typography className="stage-name">{p.title}{phaseForHighlight===p.title ? <span className="sr-only"> (active)</span> : null}</Typography><Typography className="stage-desc">{p.sub}</Typography></Box>{i<2&&<EastOutlined className="stage-arrow" fontSize="small"/>}
      </Box>)}
    </Box>}
    <Card className={`teaching-card fetch-card ${!finished&&phaseForHighlight==='FETCH'?'phase-emphasis':'phase-dimmed'}`}>
      <Stack direction="row" alignItems="center" gap={.7} mb={.6}><DownloadOutlined sx={{color:'#116cbb'}} fontSize="small"/><Typography fontSize={14} fontWeight={900}>FETCH</Typography><Typography fontSize={11} color="text.secondary">Get instruction</Typography></Stack>
      <Box className="fetch-rail-space" aria-hidden="true"/>
      <Box className="fetch-upper">
        <Box data-flow-node="pc" className="register-display pc-display" role="group" aria-label={`Program Counter: ${addressLabel(machine.pc)}`}><NumbersOutlined fontSize="small" aria-hidden="true"/><Box className="register-copy"><Typography className="register-label">Program Counter</Typography><Typography className="register-hint">Current instruction address</Typography></Box><strong className="register-number">{addressLabel(machine.pc)}</strong></Box>
        <Box data-flow-node="control" className="control-unit" role="group" aria-label="Control Unit, fetches instruction from the Program Counter"><AccountTreeOutlined fontSize="small" aria-hidden="true"/><Box className="register-copy"><Typography className="register-label">Control Unit</Typography><Typography className="register-hint">Reads the Program Counter and fetches the instruction</Typography></Box></Box>
      </Box>
      <Box className="fetch-message"><Typography fontSize={11.5}>{machine.activeAddress===null?'Ready to fetch the first instruction.':current==='FETCH'?`Reading instruction at memory address ${addressLabel(machine.activeAddress)}.`:`Address ${addressLabel(machine.activeAddress)} contains ${code}.`}</Typography></Box>
    </Card>
    <Card className={`teaching-card decode-card handoff-card ${!finished&&phaseForHighlight==='DECODE'?'phase-emphasis':'phase-dimmed'}`} data-flow-node="decode">
      <Box data-flow-node="decodeInbox" className={`handoff-slot decode-inbox ${fetchedLoaded?'is-loaded':''}`} role="status" aria-label={fetchedLoaded ? `Fetched instruction ${word(machine.ir)}, waiting for Decode` : 'No instruction fetched yet'}>{fetchedLoaded?<EncodedWord value={machine.ir} mode={displayMode}/>: '----'}</Box>
      <Box className="decode-body">
      <Stack direction="row" alignItems="center" gap={.7} mb={.7}><DataObjectOutlined fontSize="small" color="success"/><Typography fontWeight={900} fontSize={13.5}>DECODE</Typography><Typography fontSize={11} color="text.secondary">Interpret instruction</Typography></Stack>
      <Box data-flow-node="decodeJunction" className="decode-rail-junction" aria-label="Rail junction splitting opcode and address"/>
      <Box className="decode-registers">
        <Box className="decode-register" data-flow-node="ir" role="group" aria-label={`Instruction Register opcode ${irVisible ? irPart : 'not yet decoded'}`}><StorageOutlined fontSize="small" aria-hidden="true"/><span>Instruction Register</span><strong className={`word-opcode ${displayMode==='binary'?'binary-part':''}`}>{irPart}</strong></Box>
        <Box className="decode-register" data-flow-node="ar" role="group" aria-label={`Address Register operand ${arVisible ? arPart : 'not yet decoded'}`}><AlternateEmail fontSize="small" aria-hidden="true"/><span>Address Register</span><strong className={`word-operand ${displayMode==='binary'?'binary-part':''}`}>{arPart}</strong></Box>
      </Box>
      <Box className="stage-explanation decode-explanation">
        {irVisible&&arVisible?<><Chip size="small" className="decode-opcode-chip" label={inst.mnemonic} /><Typography component="span" fontSize={11}>{decodeExplanation(machine)}</Typography></>:<Typography component="span" fontSize={11}>A four-digit instruction is split into a two-digit opcode and two-digit operand.</Typography>}
      </Box>
      </Box>
    </Card>
    <Card data-flow-node="execute" className={`teaching-card execute-card handoff-card ${halted?'execute-halted':''} ${!finished&&phaseForHighlight==='EXECUTE'?'phase-emphasis':'phase-dimmed'}`}>
      <Box data-flow-node="executeInbox" className={`handoff-slot execute-inbox ${commandLoaded?'is-loaded':''}`} aria-label="Decoded command waiting for Execute" aria-live="polite">{commandLoaded?inst.mnemonic:'—'}</Box>
      <Box className={`execute-body ${current==='EXECUTE'&&!commandLoaded?'await-command':''}`}>
      <Stack direction="row" alignItems="center" gap={.7} mb={.7} sx={{pr:9}}><PlayArrowRounded sx={{color:'#ac7000'}}/><Typography fontWeight={900} fontSize={13.5}>EXECUTE</Typography>{current==='EXECUTE'&&!finished&&machine.status!=='halted'&&<CircularProgress size={14} thickness={5} aria-label="Processing instruction" sx={{color:'#a96c0a'}}/>}<Chip size="small" variant="outlined" label={machine.status==='waiting'?'Waiting for input':machine.status==='halted'?'Halted':running?'Running':current==='EXECUTE'?inst.mnemonic:'Ready'} sx={{height:21,ml:'auto',fontSize:10}}/></Stack>
      <Box className="execute-main">
        <Box className="accumulator-box" data-flow-node="acc"><Typography fontWeight={850} fontSize={12.5}>Accumulator</Typography><Box className={`accumulator-value-shell ${revealed.includes('acc')&&motion&&!motion.reverse?'acc-value-updated':''}`} key={revealed.includes('acc')&&motion&&!motion.reverse?`acc-${motion.id}`:'acc-idle'}><strong>{word(machine.acc)}</strong></Box><Typography fontSize={10.3} color="text.secondary">Working value</Typography></Box>
        <Box className="execution-detail execution-detail-consistent"><Typography fontWeight={750} fontSize={11.7}>{finished?machine.message.replace(/^[A-Z]+\s*·\s*/, ''):current!=='EXECUTE'?'Ready for the decoded command.':machine.status==='waiting'?executionExplanation(machine):!revealed.includes('executeInbox')?'Receiving decoded command…':(branchOp==='BRZ'||branchOp==='BRP')&&!branchOperandArrived?'Reading the Accumulator…':checkingBranch?branch?.checking:branchChecked?branch?.result:pcTravelling?instructionOutcome:scramble!==null?'Generating a random number…':!revealed.includes('complete')&&!revealed.some(x=>['acc','output','memoryOperand','pc'].includes(x))?`Executing ${inst.mnemonic}…`:executionExplanation(machine)}</Typography>{updateDescription&&<Typography className="pc-update-caption" fontSize={10.6} fontWeight={800}>{updateDescription}</Typography>}</Box>
      </Box>
      <Box className={`alu-box ${aluFormula?'alu-calculating':''}`} data-flow-node="alu"><CalculateOutlined sx={{color:'#7654ba'}} fontSize="small"/><Box><Typography fontSize={12} fontWeight={900}>Arithmetic Unit (ALU)</Typography><Typography fontSize={10.5}>Performs arithmetic</Typography></Box>
      </Box>
      {(aluFormula||randomText!==null||showingPcBranch)&&<AluPopupPortal key={`alu-${motion?.id}`}><strong className={`alu-plus-one alu-equation ${randomText!==null?'alu-random-equation':''}`} aria-live="polite">
        {randomText!==null ? <>RND <span className="alu-scramble-digits">{randomText}</span></> : <span className="alu-equation-text">{showingPcBranch?<>Set counter to {slot(addressLabel(motion?.next.pc ?? machine.pc),'value-result')}</> : aluFormula}</span>}
      </strong></AluPopupPortal>}
      </Box>
    </Card>
    <ComputerPanel halted={halted} machine={machine} running={running} sendInput={sendInput} clearOutput={clearOutput}/>
  </Box>;
}
