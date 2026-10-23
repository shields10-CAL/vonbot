import { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, Chip, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { BackspaceOutlined, ContentCopy, InputOutlined, TerminalOutlined } from '@mui/icons-material';
import { word } from '../core/assembler';
import type { Machine } from '../core/machine';
import { outputText } from '../core/machine';

/** Input and Output stay visible beneath the three CPU phases at every desktop memory size. */
export default function ComputerPanel({machine,sendInput,clearOutput,halted=false}:{machine:Machine;halted?:boolean;running:boolean;sendInput:(n:number)=>void;clearOutput:()=>void}){
 const [input,setInput]=useState('');const inputRef=useRef<HTMLInputElement>(null);const consoleRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(consoleRef.current)consoleRef.current.scrollTop=consoleRef.current.scrollHeight;},[machine.output.length]);
 useEffect(()=>{if(machine.status==='waiting')inputRef.current?.focus();},[machine.status]);
 const output=outputText(machine.output);
 const valid=input.trim()!==''&&Number.isInteger(Number(input))&&Number(input)>=0&&Number(input)<=9999;
 const submit=()=>{if(valid){sendInput(Number(input));setInput('');}};
 return <Box className={`io-grid teaching-io ${halted?'io-halted':''}`}>
  <Card data-flow-node="input" className={`input-card ${machine.status==='waiting'?'input-needs-value':''}`} sx={{p:1.15,bgcolor:'#f2ebff',minHeight:0,display:'flex',flexDirection:'column'}}>
    <Stack direction="row" alignItems="center" gap={.5}><InputOutlined sx={{color:'#65319f',fontSize:19}}/><Typography fontSize={13.5} fontWeight={850} color="#65319f">Input</Typography>{machine.status==='waiting'&&<Chip label="REQUIRED" size="small" color="secondary" sx={{height:19,fontSize:9}}/>}</Stack>
    <Typography color="text.secondary" fontSize={10}>Enter a number (0–9999)</Typography>
    <Stack direction="row" gap={.5} sx={{mt:'auto',pt:.5}}><TextField inputRef={inputRef} size="small" type="number" fullWidth placeholder="e.g. 42" aria-label="Input number from 0 to 9999" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit();}} slotProps={{htmlInput:{min:0,max:9999,step:1}}}/><Button size="small" variant="contained" onClick={submit} disabled={!valid} aria-label="Send number to Accumulator">Send</Button></Stack>
    {machine.input.length>0&&<Typography fontSize={10}>Queued: {machine.input.map(word).join(', ')}</Typography>}
  </Card>
  <Card data-flow-node="output" sx={{p:1.15,bgcolor:'#f2ebff',minHeight:0,display:'flex',flexDirection:'column'}}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" gap={.5}><TerminalOutlined sx={{color:'#65319f',fontSize:19}}/><Typography fontSize={13.5} fontWeight={850} color="#65319f">Output</Typography></Stack><Stack direction="row"><Tooltip title="Copy output"><span><IconButton size="small" disabled={!output} onClick={()=>navigator.clipboard?.writeText(output)} aria-label="Copy output"><ContentCopy sx={{fontSize:16}}/></IconButton></span></Tooltip><Tooltip title="Clear output"><IconButton size="small" onClick={clearOutput} aria-label="Clear output"><BackspaceOutlined sx={{fontSize:16}}/></IconButton></Tooltip></Stack></Stack>
    <Box ref={consoleRef} className="console" role="log" aria-label="Program output" aria-relevant="additions text" aria-live="polite">{output}</Box>
  </Card>
 </Box>;
}
