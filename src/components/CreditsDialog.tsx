import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Typography } from '@mui/material';
import VonBotMark from './VonBotMark';

export default function CreditsDialog({open,onClose}:{open:boolean;onClose:()=>void}){
 return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="credits-dialog-title">
   <DialogTitle id="credits-dialog-title" sx={{display:'flex',alignItems:'center',gap:1,fontWeight:850}}>About VonBot <Box sx={{ml:'auto',bgcolor:'#1769bc',borderRadius:2,width:44,height:44,display:'grid',placeItems:'center'}}><VonBotMark size={34}/></Box></DialogTitle>
   <DialogContent dividers>
     <Typography sx={{fontWeight:850,mb:.5}}>Meet Von. Your Little Computer.</Typography>
     <Typography fontSize={13.5} paragraph>VonBot is an independent educational CPU simulator directly inspired by the <b>Little Man Computer</b> and the work of <b>Peter Higginson</b>.</Typography>
     <Typography fontSize={13.5} paragraph>It grew from a desire to modernize the interface, extend the instruction set, introduce approachable block coding, and reimagine the CPU and data-flow visualization to make computer architecture more accessible to learners.</Typography>
     <Typography fontSize={13.5}>Original inspiration: <Link href="https://www.peterhigginson.co.uk/lmc/" target="_blank" rel="noopener noreferrer">Peter Higginson’s Little Man Computer simulator</Link>.</Typography>
     <Typography fontSize={12} color="text.secondary" sx={{mt:2}}>VonBot is a separate project and does not imply affiliation with or endorsement by the original creators. Source code is released under the MIT license.</Typography>
   </DialogContent>
   <DialogActions><Button variant="contained" onClick={onClose}>Close</Button></DialogActions>
 </Dialog>;
}
