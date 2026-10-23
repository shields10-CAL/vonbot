import { useMemo, useState, useEffect, useRef } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { Alert, Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowBack, Delete, DragIndicator, ViewModuleOutlined } from '@mui/icons-material';
import { FormControlLabel, Switch } from '@mui/material';
import { OPCODES, assemble, addressLabel } from '../core/assembler';
import { CATEGORIES, INSTRUCTIONS, instruction } from '../data/instructions';
import type { Machine } from '../core/machine';

export type Block={raw:string;isNote:boolean;label:string;op:string;arg:string;comment:string};
const legal=new Set<string>([...OPCODES,'STO','OTC','COB','.ORG']);
/** Only instructions with a memory-address operand accept a dragged RAM address. */
export const ADDRESS_COMMANDS=new Set(['LDA','STA','ADD','SUB','BRA','BRZ','BRP']);
export function parseBlocks(source:string):Block[]{
  return source.split('\n').map(raw=>{
    const trimmed=raw.trim();
    if(!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//') || /^[A-Za-z_][\w]*:$/.test(trimmed))return {raw,isNote:true,label:'',op:'',arg:'',comment:''};
    const [code,...notes]=raw.split(';');
    const parts=code.trim().split(/\s+/).filter(Boolean);
    const label=parts.length>1&&!legal.has(parts[0].toUpperCase())?parts.shift()!.replace(/:$/, ''):'';
    const op=(parts.shift()||'').toUpperCase();
    return {raw,isNote:false,label,op,arg:parts.join(' '),comment:notes.join(';').replace(/^\s/, '')};
  });
}
export function stringifyBlocks(blocks:Block[]):string{
  // Standard assembly listing layout: label column at left, opcode column aligned.
  const width=blocks.some(b=>!b.isNote&&b.label)?Math.max(7,...blocks.filter(b=>b.label).map(b=>b.label.length+2)):0;
  return blocks.map(b=>{
    if(b.isNote)return b.raw;
    const heading=b.label?b.label.replace(/:$/, '')+':':'';
    const column=width?heading.padEnd(width,' '):heading;
    return `${column}${b.op}${b.arg?' '+b.arg:''}${b.comment?' ; '+b.comment:''}`;
  }).join('\n');
}
const empty=(op:string):Block=>({raw:'',isNote:false,label:'',op,arg:instruction(op)?.defaultArg||'',comment:''});

/** The opcode IS the block, not a field to configure. All drag operations preserve original assembly labels. */
export default function BlockEditor({source,onChange,extended,onClose,activeLine,machine}:{source:string;onChange:(s:string)=>void;extended:boolean;onClose:()=>void;activeLine:number|null;machine:Machine}){
  const blocks=useMemo(()=>parseBlocks(source),[source]);
  const lineAddresses=useMemo(()=>assemble(source,Math.max(machine.memory.length,64),extended).lineToAddress,[source,machine.memory.length,extended]);
  const [category,setCategory]=useState('Input / Output');
  const [showInlineComments,setShowInlineComments]=useState(false);
  const [linkFrom,setLinkFrom]=useState<number|null>(null);
  const [pointer,setPointer]=useState<{x:number;y:number}|null>(null);
  const [wireWarning,setWireWarning]=useState(false);
  const workRef=useRef<HTMLDivElement|null>(null);
  const [wires,setWires]=useState<string[]>([]);
  const [dragIndex,setDragIndex]=useState<number|null>(null);
  const [dropIndex,setDropIndex]=useState<number|null>(null);
  const palette=INSTRUCTIONS.filter(i=>i.category===category&&i.op!=='.ORG'&&(extended||i.classic));
  const isBranch=(op:string)=>['BRA','BRZ','BRP'].includes(op);
  const connect=(from:number,to:number)=>{const name=blocks[to]?.label;if(name&&isBranch(blocks[from]?.op))edit(from,{arg:name});setLinkFrom(null);setPointer(null);setWireWarning(false);};
  const startLink=(from:number)=>{
    if(linkFrom===from){setLinkFrom(null);setPointer(null);return;}
    if(!blocks.some(b=>b.label.trim())){setWireWarning(true);setLinkFrom(null);return;}
    setWireWarning(false);setLinkFrom(from);
  };
  useEffect(()=>{
    if(linkFrom===null)return;
    const move=(e:MouseEvent)=>{const root=workRef.current;if(!root)return;const r=root.getBoundingClientRect();setPointer({x:e.clientX-r.left+root.scrollLeft,y:e.clientY-r.top+root.scrollTop});};
    const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();setLinkFrom(null);setPointer(null);}};
    window.addEventListener('pointermove',move);window.addEventListener('dragover',move);window.addEventListener('keydown',cancel,true);
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('dragover',move);window.removeEventListener('keydown',cancel,true);};
  },[linkFrom]);
  useEffect(()=>{
    const root=workRef.current;if(!root)return;
    const update=()=>{const r=root.getBoundingClientRect(),next:string[]=[];
      blocks.forEach((b,i)=>{if(!isBranch(b.op))return;const target=blocks.findIndex(x=>x.label&&x.label.toUpperCase()===b.arg.toUpperCase());if(target<0)return;
      const a=root.querySelector(`[data-branch-output=\"${i}\"]`)?.getBoundingClientRect();
      const z=root.querySelector(`[data-label-input=\"${target}\"]`)?.getBoundingClientRect();
      if(!a||!z)return;const sx=a.left-r.left+a.width/2+root.scrollLeft,sy=a.top-r.top+a.height/2+root.scrollTop,tx=z.left-r.left+z.width/2+root.scrollLeft,ty=z.top-r.top+z.height/2+root.scrollTop;
      const bend=Math.min(sx,tx)-Math.max(30,Math.abs(sx-tx)*.25);next.push(`M${sx} ${sy} C${bend} ${sy},${bend} ${ty},${tx} ${ty}`);
      });setWires(next);};
    update();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);observer?.observe(root);root.querySelectorAll('.block-stack-row').forEach(el=>observer?.observe(el));root.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{observer?.disconnect();root.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[blocks]);
  const liveWire=useMemo(()=>{
    if(linkFrom===null||!pointer||!workRef.current)return '';
    const root=workRef.current;const origin=root.querySelector(`[data-branch-output="${linkFrom}"]`)?.getBoundingClientRect();
    if(!origin)return '';const r=root.getBoundingClientRect();
    const x=origin.left-r.left+origin.width/2+root.scrollLeft,y=origin.top-r.top+origin.height/2+root.scrollTop;
    return `M${x} ${y} C${x+50} ${y}, ${pointer.x-50} ${pointer.y}, ${pointer.x} ${pointer.y}`;
  },[linkFrom,pointer]);
  const commit=(items:Block[])=>onChange(stringifyBlocks(items));
  const edit=(index:number,patch:Partial<Block>)=>commit(blocks.map((b,i)=>i===index?{...b,...patch}:b));
  const remove=(index:number)=>commit(blocks.filter((_,i)=>i!==index));
  const useDraggedAddress=(event:DragEvent,index:number):boolean=>{
    const address=event.dataTransfer.getData('application/x-lmc-memory-address');
    if(!address)return false;
    event.preventDefault();event.stopPropagation();
    if(ADDRESS_COMMANDS.has(blocks[index]?.op))edit(index,{arg:address});
    return true;
  };

  const insertionPoint=(op:string)=>{
    if(op==='DAT'||op==='.ORG')return blocks.length;
    const data=blocks.findIndex(b=>b.op==='DAT'||b.op==='.ORG');
    const halt=blocks.findIndex(b=>b.op==='HLT');
    if(op==='HLT')return data<0?blocks.length:data;
    return halt>=0?halt:data>=0?data:blocks.length;
  };
  const add=(op:string,index?:number)=>{const copy=[...blocks];copy.splice(index??insertionPoint(op),0,op==='COMMENT'?{raw:'; ',isNote:true,label:'',op:'',arg:'',comment:''}:empty(op));commit(copy);};
  const reorder=(from:number,to:number)=>{
    if(from<0||to<0||from>=blocks.length||to>blocks.length||from===to||from+1===to)return;
    const copy=[...blocks];const [moving]=copy.splice(from,1);copy.splice(from<to?to-1:to,0,moving);commit(copy);
  };
  const onDrop=(event:DragEvent,index:number)=>{
    event.preventDefault();event.stopPropagation();
    const opcode=event.dataTransfer.getData('application/x-lmc-operation');
    if(opcode&&(opcode==='COMMENT'||instruction(opcode)))add(opcode,index);
    else {const line=event.dataTransfer.getData('application/x-lmc-line');if(line!==''&&Number.isInteger(Number(line)))reorder(Number(line),index);}
    setDropIndex(null);setDragIndex(null);
  };
  return <section className="blocks-overlay" aria-label="Block coding editor">
    <div className="blocks-topbar"><div className="blocks-title"><ViewModuleOutlined/><strong>Block coding</strong><span>Choose or drag commands. Alt+Up / Alt+Down reorders a focused block.</span></div><FormControlLabel className="inline-comments-toggle" control={<Switch size="small" checked={showInlineComments} onChange={e=>setShowInlineComments(e.target.checked)} />} label="Inline comments"/><Button variant="outlined" size="small" startIcon={<ArrowBack/>} onClick={onClose}>Code editor</Button></div>
    <div className="blocks-layout">
      <nav className="blocks-categories" aria-label="Block categories">{CATEGORIES.filter(c=>extended||c.name!=='Random').map(c=><button type="button" key={c.name} className={category===c.name?'category-active':''} onClick={()=>setCategory(c.name)} style={{'--category-color':c.color} as CSSProperties}><span className="category-dot"/>{c.name}</button>)}</nav>
      <Box className="blocks-flyout scroll-lite" aria-label={`${category} instruction toolbox`}>
        <Typography fontSize={13} fontWeight={900} sx={{mb:1}}>{category}</Typography>
        <Typography sx={{fontSize:11,color:'#52647c',mb:2}}>Drag a command here. You can also drag a RAM address into a command’s white address socket.</Typography>
        {category==='Basic'&&<Tooltip title="Add a movable standalone comment"><button type="button" draggable className="toolbox-block comment-toolbox-block" style={{'--block-color':'#347e62'} as CSSProperties} onClick={()=>add('COMMENT')} onDragStart={e=>{e.dataTransfer.setData('application/x-lmc-operation','COMMENT');e.dataTransfer.effectAllowed='copy';}}>COMMENT</button></Tooltip>}
        {palette.map(meta=><Tooltip key={meta.op} title={meta.long} placement="right"><button type="button" draggable className="toolbox-block" style={{'--block-color':CATEGORIES.find(c=>c.name===meta.category)?.color} as CSSProperties} onClick={()=>add(meta.op)} onDragStart={e=>{e.dataTransfer.setData('application/x-lmc-operation',meta.op);e.dataTransfer.effectAllowed='copy';}}><span className="toolbox-op">{meta.op}</span>{meta.operand&&<span className="fake-slot">{meta.defaultArg}</span>}</button></Tooltip>)}
      </Box>
      <Box ref={workRef} className="blocks-workspace scroll-lite" aria-label="Block program workspace" onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,blocks.length)}>
        <svg className="block-link-wires" aria-hidden="true">{wires.map((d,i)=><path key={i} d={d}/>)}{liveWire&&<><path className="preview-wire" d={liveWire}/>{pointer&&<circle cx={pointer.x} cy={pointer.y} r={8} className="preview-wire-tip"/>}</>}</svg><Box className="workspace-heading"><ViewModuleOutlined fontSize="small"/><Typography fontSize={13} fontWeight={900}>My program</Typography><Typography fontSize={11} color="text.secondary">{blocks.filter(b=>!b.isNote).length} commands</Typography></Box>
        {wireWarning&&<Alert className="wire-connect-warning" severity="error" onClose={()=>setWireWarning(false)}>Block must have a label to connect to</Alert>}
        {linkFrom!==null&&<div className="wire-connect-hint" role="status">Select a labeled block to connect. Esc or Backspace cancels.</div>}
        {blocks.length===0&&<Box className="workspace-placeholder">Drag instructions from the toolbox to start building your program.</Box>}
        {blocks.map((b,i)=>b.isNote?<div key={i} className={`block-comment ${dragIndex===i?'drag-source':''} ${dropIndex===i?'drop-target':''}`} onDragOver={e=>{e.preventDefault();e.stopPropagation();setDropIndex(i);}} onDrop={e=>onDrop(e,i)}>
          <span className="block-line-number" aria-label={`Source line ${i}`}>{i}</span><span className="comment-grip" role="button" tabIndex={0} aria-label={`Move comment on line ${i}. Press Alt+Up or Alt+Down to reorder.`} title="Drag, or press Alt+Up / Alt+Down to reorder" onKeyDown={e=>{if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();reorder(i,i-1);}else if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();reorder(i,i+2);}}} draggable onDragStart={e=>{setDragIndex(i);e.dataTransfer.setData('application/x-lmc-line',String(i));e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{setDragIndex(null);setDropIndex(null);}}><DragIndicator fontSize="small"/></span>
          <input aria-label={`Comment on line ${i}`} value={b.raw} onChange={e=>edit(i,{raw:e.target.value})} placeholder="; Comment / blank line"/><Tooltip title="Remove comment"><IconButton size="small" onClick={()=>remove(i)}><Delete fontSize="small"/></IconButton></Tooltip></div>:
          <div key={i} style={{zIndex:blocks.length-i}} className={`block-stack-row ${dragIndex===i?'drag-source':''} ${dropIndex===i?'drop-target':''} ${machine.status==='waiting'&&activeLine===i+1&&b.op==='INP'?'input-block-pulse':''} ${activeLine===i+1?'executing-block':''}`} onDragOver={e=>{e.preventDefault();e.stopPropagation();setDropIndex(i);}} onDrop={e=>{if(!useDraggedAddress(e,i))onDrop(e,i);}}>
            <span className="block-line-number" title={`Source line ${i}`} aria-label={`Source line ${i}, memory address ${lineAddresses[i+1]===undefined?'not allocated':addressLabel(lineAddresses[i+1])}`}><small>{i}</small><b>{lineAddresses[i+1]===undefined?'—':addressLabel(lineAddresses[i+1])}</b></span>
            <div className={`block-label-socket ${linkFrom!==null&&b.label?'link-target':''}`} onDragOver={e=>{if(b.label&&e.dataTransfer.types.includes('application/x-vonbot-branch')){e.preventDefault();e.stopPropagation();}}} onDrop={e=>{const from=e.dataTransfer.getData('application/x-vonbot-branch');if(from!==''&&b.label){e.preventDefault();e.stopPropagation();connect(Number(from),i);}}}>
              {b.label&&<button type="button" data-label-input={i} className="label-connection" title={`Connect branch to ${b.label}`} aria-label={`Connect a branch to label ${b.label}`} onClick={()=>{if(linkFrom!==null)connect(linkFrom,i);}}/>}
              <input aria-label={`Label for ${b.op} on line ${i}`} spellCheck={false} placeholder="Label" value={b.label} onChange={e=>edit(i,{label:e.target.value.replace(/[^A-Za-z0-9_]/g,'').toUpperCase()})} />
              <span>:</span>
            </div>
            <div className="block-piece" tabIndex={0} role="listitem" aria-label={`${b.op} block. Alt+Up or Alt+Down reorders this block; or drag it. Set its operand using the adjacent input.`} onKeyDown={e=>{if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();reorder(i,i-1);}if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();reorder(i,i+2);}}} title={b.label?`Instruction label: ${b.label}`:instruction(b.op)?.long} style={{'--block-color':CATEGORIES.find(c=>c.name===instruction(b.op)?.category)?.color||'#637d9a'} as CSSProperties} draggable onDragStart={e=>{setDragIndex(i);e.dataTransfer.setData('application/x-lmc-line',String(i));e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{setDragIndex(null);setDropIndex(null);}}>
              <DragIndicator className="piece-grip" sx={{fontSize:17}}/>
              <strong className="piece-command">{b.op}</strong>{isBranch(b.op)&&<button type="button" draggable data-branch-output={i} className={`branch-port ${linkFrom===i?'link-selected':''}`} aria-label={`Connect ${b.op} to a labeled block`} title="Drag this connector onto a label, or click then select a label" onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData('application/x-vonbot-branch',String(i));e.dataTransfer.effectAllowed='link';startLink(i);}} onDragEnd={()=>{setLinkFrom(null);setPointer(null);}} onClick={e=>{e.stopPropagation();startLink(i);}}>●</button>}
              {(instruction(b.op)?.operand||b.arg)&&<input aria-label={`${b.op} operand at line ${i}`} className={`piece-operand ${ADDRESS_COMMANDS.has(b.op)?'address-socket':''}`} onDragOver={e=>{if(ADDRESS_COMMANDS.has(b.op)){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='copy';}}} onDrop={e=>{if(ADDRESS_COMMANDS.has(b.op))useDraggedAddress(e,i);}} value={b.arg} onChange={e=>edit(i,{arg:e.target.value})} placeholder={b.op==='DAT'?'value':'address'}/>}
            </div>
            {showInlineComments&&<input className="inline-block-comment" aria-label={`Inline comment on line ${i}`} placeholder="Comment" value={b.comment} onChange={e=>edit(i,{comment:e.target.value})} title="Optional comment" />}
            <Tooltip title="Delete block"><IconButton className="block-delete" aria-label={`Remove ${b.op} block`} size="small" onClick={()=>remove(i)}><Delete sx={{fontSize:18}}/></IconButton></Tooltip>
          </div>)}
        <div className={`block-bottom-drop ${blocks.length?'drop-zone-compact':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,blocks.length)} aria-label="Drop instruction at end of program">{blocks.length===0?'Drop command here':''}</div>
      </Box>
    </div>
  </section>;
}
