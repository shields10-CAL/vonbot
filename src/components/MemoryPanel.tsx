import { Box, Button, Card, Chip, Divider, Stack, Tooltip, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { GridView, MyLocation, RadioButtonChecked } from '@mui/icons-material';
import type { Machine } from '../core/machine';
import { decode, addressLabel, word } from '../core/assembler';
import { splitWordParts } from '../core/wordFormat';
import type { NumberDisplay } from '../core/wordFormat';
export { splitWordParts } from '../core/wordFormat';
export function EncodedWord({value,mode}:{value:number;mode:NumberDisplay}){
  const [op,operand]=splitWordParts(value,mode);
  return <span className={`encoded-word ${mode==='binary'?'binary-word':'decimal-word'}`}><span className="word-opcode">{op}</span><span className="word-operand">{operand}</span></span>;
}
export default function MemoryPanel({ machine, selected, setSelected, breakpoints, toggleBreakpoint, blockMode=false,displayMode,setDisplayMode }: { machine:Machine; selected:number|null; setSelected:(n:number|null)=>void; breakpoints:Set<number>; toggleBreakpoint:(n:number)=>void; blockMode?:boolean;displayMode:NumberDisplay;setDisplayMode:(mode:NumberDisplay)=>void }) {
  const size = machine.memory.length;
  const cols = size <= 16 ? 4 : 8;
  const kindNames:Record<string,string>={instruction:'Instruction',dat:'DAT declaration',data:'Stored value',empty:'Empty address'};
  return <Card className="memory-panel" role="region" aria-label="RAM address grid" sx={{ bgcolor:'#e2f8e2', p:1.3, minWidth:0 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{mb:1}}>
      <Stack direction="row" spacing={1} alignItems="center"><GridView sx={{color:'#287e43'}}/><Typography variant="h6" sx={{color:'#225b35'}}>RAM</Typography></Stack>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <ToggleButtonGroup size="small" exclusive value={displayMode} aria-label="Number display format" onChange={(_,mode:NumberDisplay|null)=>{if(mode)setDisplayMode(mode)}} sx={{'.MuiToggleButton-root':{px:1,py:.25,fontSize:10,fontWeight:800}}}>
          <ToggleButton value="decimal" aria-label="Show opcode and operand in decimal">DEC</ToggleButton>
          <ToggleButton value="binary" aria-label="Show opcode and operand as seven-bit binary numbers">BIN</ToggleButton>
        </ToggleButtonGroup>
        {[['#b0d4fb','Instructions','solid'],['#91e2bd','DAT declaration','dashed'],['#ffdfa3','Stored value','dotted'],['#344251','Empty','double']].map(([color,name,style])=><Stack key={name} direction="row" spacing={.5} alignItems="center"><Box sx={{height:12,width:12,background:color,border:`2px ${style} #24354a`,borderRadius:.5}} aria-hidden="true"/><Typography variant="caption" sx={{fontSize:10.5}}>{name}</Typography></Stack>)}
      </Stack>
    </Stack>

    <Box className="memory-inner" sx={{ bgcolor:'white', borderRadius:2, p:.8, minWidth:0 }}>
      <Box className="memory-scroll scroll-lite">
        <Box className="memory-grid" sx={{gridTemplateColumns:`20px repeat(${cols}, minmax(0,1fr))`,"--ram-rows":size/cols}}>
          <Box/>{Array.from({length:cols},(_,i)=><Typography key={'h'+i} sx={{textAlign:'center',fontSize:11,fontWeight:800,color:'#738a9b',mb:.3}}>{i}</Typography>)}
          {Array.from({length:size/cols},(_,row)=><Box key={row} sx={{display:'contents'}}>
            <span className="row-heading">{row*cols}</span>
            {Array.from({length:cols},(_,col)=>{
              const n=row*cols+col;
              const isActive=n===machine.activeAddress;
              const isTarget=n===machine.mar && machine.phase!=='fetch' && machine.mar!==machine.activeAddress;
              return <Tooltip key={n} arrow title={`Memory address ${addressLabel(n)}: ${word(machine.memory[n])} · ${machine.kinds[n]}${machine.kinds[n]==='instruction' ? ` (${decode(machine.memory[n]).mnemonic})` : ''}`}>
                <button data-memory-address={n} draggable={blockMode} onDragStart={event=>{if(!blockMode){event.preventDefault();return;}event.dataTransfer.setData('application/x-lmc-memory-address',addressLabel(n));event.dataTransfer.effectAllowed='copy';}} tabIndex={0} className={`memory-cell ${machine.kinds[n]==='instruction'?'code':machine.kinds[n]==='dat'?'dat':machine.kinds[n]==='data'?'data':'empty'} ${isActive?'active':''} ${isTarget?'target':''} ${breakpoints.has(n)?'breakpoint':''}`} aria-label={`Memory address ${addressLabel(n)}, value ${word(machine.memory[n])}, ${kindNames[machine.kinds[n]] ?? 'Unknown'}, ${isActive?'current instruction':isTarget?'current operand': 'not active'}${breakpoints.has(n)?', breakpoint set':''}`} aria-pressed={selected===n} onClick={()=>setSelected(selected===n?null:n)}>
                  <span className="addr">{addressLabel(n)}</span><span className="val" aria-hidden="true"><EncodedWord value={machine.memory[n]} mode={displayMode}/></span><span className="sr-only">{kindNames[machine.kinds[n]] ?? 'Unknown'}{isActive?', executing':''}{breakpoints.has(n)?', breakpoint':''}</span>
                </button>
              </Tooltip>;
            })}
          </Box>)}
        </Box>
      </Box>
      {selected!==null && selected<size && <Box sx={{mt:1.5,px:1,py:.5}}>
        <Divider sx={{mb:1}}/>
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
          <MyLocation fontSize="small" color="primary"/><Typography fontWeight={750} variant="body2">Memory address {addressLabel(selected)}</Typography>
          <Chip size="small" label={<><EncodedWord value={machine.memory[selected]} mode={displayMode}/> · {machine.kinds[selected]}</>} />
          <Typography variant="caption" color="text.secondary" sx={{flex:1}}> {decode(machine.memory[selected]).mnemonic} {decode(machine.memory[selected]).operand ?? ''}</Typography>
          <Button size="small" color={breakpoints.has(selected)?'error':'primary'} variant="outlined" startIcon={<RadioButtonChecked/>} onClick={()=>toggleBreakpoint(selected)}>{breakpoints.has(selected)?'Remove breakpoint':'Set breakpoint'}</Button>
        </Stack>
      </Box>}
    </Box>
  </Card>;
}
