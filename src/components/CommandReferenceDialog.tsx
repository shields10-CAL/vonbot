import { Chip, Dialog, DialogActions, DialogContent, DialogTitle, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { OPCODE_IDS } from '../core/assembler';
import { INSTRUCTIONS } from '../data/instructions';

const commands = [
 ...INSTRUCTIONS.filter(item=>item.op in OPCODE_IDS).sort((a,b)=>OPCODE_IDS[a.op as keyof typeof OPCODE_IDS]-OPCODE_IDS[b.op as keyof typeof OPCODE_IDS]),
 ...INSTRUCTIONS.filter(item=>item.op==='DAT')
];
export default function CommandReferenceDialog({open,onClose}:{open:boolean;onClose:()=>void}){
 return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="commands-dialog-title">
  <DialogTitle id="commands-dialog-title" sx={{fontWeight:850}}>VonBot command reference</DialogTitle>
  <DialogContent dividers>
   <TableContainer sx={{border:'1px solid #dbe5ed',borderRadius:2,overflow:'auto'}}>
    <Table size="small" aria-label="VonBot command reference">
     <TableHead><TableRow sx={{bgcolor:'#e5f2ff'}}>
      {['Command','Opcode','Description'].map(heading=><TableCell key={heading} sx={{fontWeight:900,color:'#26394b',fontSize:13,borderBottom:'2px solid #9bbbd9'}}>{heading}</TableCell>)}
     </TableRow></TableHead>
     <TableBody>{commands.map((item,i)=><TableRow key={item.op} sx={{bgcolor:i%2?'#f1f6fa':'#fff','&:last-child td':{borderBottom:0}}}>
      <TableCell sx={{width:110}}><Chip size="small" color="primary" variant="outlined" label={item.op} sx={{fontFamily:'monospace',fontWeight:800}}/></TableCell>
      <TableCell sx={{width:85,fontFamily:'ui-monospace,monospace',fontWeight:900}}>{item.op==='DAT'?'—':String(OPCODE_IDS[item.op as keyof typeof OPCODE_IDS]).padStart(2,'0')}</TableCell>
      <TableCell><Typography fontSize={12.5}>{item.long}</Typography>{item.operand&&<Typography color="text.secondary" fontSize={11}>Requires {item.op==='LDI'?'a number (00–99)':item.op==='DAT'?'an initial value (0000–9999)':'an address or label'}.</Typography>}</TableCell>
     </TableRow>)}</TableBody>
    </Table>
   </TableContainer>
  </DialogContent>
  <DialogActions><Button variant="contained" onClick={onClose}>Close</Button></DialogActions>
 </Dialog>;
}
