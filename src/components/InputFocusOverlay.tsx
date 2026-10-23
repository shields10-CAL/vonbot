import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
/** Four scrim pieces leave a true un-dimmed, clickable cutout around Input.
 * Unlike z-index tricks, this does not depend on the nested card stacking context. */
export default function InputFocusOverlay({active}:{active:boolean}) {
  const [rect,setRect]=useState<{left:number;top:number;right:number;bottom:number}|null>(null);
  useEffect(()=>{
    if(!active){setRect(null);return;}
    const update=()=>{
      const el=document.querySelector('.teaching-io [data-flow-node="input"]');
      if(!el)return;
      const r=el.getBoundingClientRect(),pad=11;
      setRect({left:Math.max(0,r.left-pad),top:Math.max(0,r.top-pad),right:Math.min(window.innerWidth,r.right+pad),bottom:Math.min(window.innerHeight,r.bottom+pad)});
    };
    update();
    const obs=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    const el=document.querySelector('.teaching-io [data-flow-node="input"]');if(el)obs?.observe(el);
    window.addEventListener('resize',update);window.addEventListener('scroll',update,true);
    return()=>{obs?.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  },[active]);
  if(!active||!rect)return null;
  const r=rect,shade='rgba(4,15,32,.78)';
  return <Box className="input-focus-overlay" role="presentation" aria-hidden="true">
    <Box className="input-focus-scrim" sx={{left:0,top:0,width:'100vw',height:r.top,background:shade}}/>
    <Box className="input-focus-scrim" sx={{left:0,top:r.top,width:r.left,height:r.bottom-r.top,background:shade}}/>
    <Box className="input-focus-scrim" sx={{left:r.right,top:r.top,width:`calc(100vw - ${r.right}px)`,height:r.bottom-r.top,background:shade}}/>
    <Box className="input-focus-scrim" sx={{left:0,top:r.bottom,width:'100vw',height:`calc(100vh - ${r.bottom}px)`,background:shade}}/>
    <Box className="input-focus-ring" sx={{left:r.left,top:r.top,width:r.right-r.left,height:r.bottom-r.top}}/>
  </Box>;
}
