import type { ChangeEvent } from 'react';
import InputFocusOverlay from './components/InputFocusOverlay';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppBar, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel, Menu, MenuItem, Select, Slider, Snackbar, Stack, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import { CheckCircle, ChevronRight, Code, ContentCopy, AddCircleOutline, Download, HelpOutline, InfoOutlined, Memory, Pause, PlayArrow, Refresh, SettingsOutlined, AutoFixHighOutlined, SpeedOutlined, SkipNext, Stop, UploadFile, ViewModuleOutlined, Undo } from '@mui/icons-material';
import CodeEditor from './components/CodeEditor';
import BlockEditor from './components/BlockEditor';

import DataFlowPanel from './components/DataFlowPanel';
import FlowRails from './components/FlowRails';
import type { FlowTransition } from './components/FlowRails';
import MemoryPanel from './components/MemoryPanel';
import { assemble, addressLabel } from './core/assembler';
import { formatAssembly } from './core/formatAssembly';
import { createMachine, enqueueInput, microstep, seedValue } from './core/machine';
import type { Machine } from './core/machine';
import { presentationMachine } from './core/presentation';
import { defaultProject, exportText, fileSafe, loadProject, saveProject, shareURL } from './core/project';
import type { Project } from './core/project';
import VonBotMark from './components/VonBotMark';
import RamUsageMeter from './components/RamUsageMeter';
import CommandReferenceDialog from './components/CommandReferenceDialog';
import CreditsDialog from './components/CreditsDialog';

import { MIN_VELOCITY, MAX_VELOCITY, DEFAULT_VELOCITY, isTurboSpeed } from './core/liveSpeed';
type Appearance = 'default'|'colorblind'|'high-contrast';
export default function App(){
 const [project,setProject]=useState<Project>(()=>loadProject());
 const [machine,setMachine]=useState<Machine>(()=>createMachine(assemble(project.source,project.memorySize,project.extended),project.seed ?? Date.now(),project.extended));
 const machineRef=useRef(machine);
 const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[saved,setSaved]=useState(true);
 const [editorMode,setEditorMode]=useState<'code'|'blocks'>('code');
 const [stepping,setStepping]=useState(false);const stepToken=useRef(0);
 const seededAtRun=useRef(false);
 const playback=useRef<'idle'|'run'|'step'>('idle');
 const historyRef=useRef<Machine[]>([]);const [historySize,setHistorySize]=useState(0);
 const eventId=useRef(0);const [motion,setMotion]=useState<FlowTransition|null>(null);
 const [settledMotion,setSettledMotion]=useState(0);
 const [arrivals,setArrivals]=useState<{id:number;nodes:string[]}>({id:0,nodes:[]});
 const [branchCheckProgress,setBranchCheckProgress]=useState<{id:number;fraction:number}>({id:0,fraction:0});
 const [speed,setSpeed]=useState<number>(DEFAULT_VELOCITY),[running,setRunning]=useState(false);
 const [paused,setPaused]=useState(false);
 const pauseFlag=useRef(false);
 const setPauseState=(value:boolean)=>{pauseFlag.current=value;setPaused(value);};
 const turbo=isTurboSpeed(speed);
 const [displayMode,setDisplayMode]=useState<'decimal'|'binary'>(()=>{try{return localStorage.getItem('vonbot.display')==='binary'?'binary':'decimal'}catch{return 'decimal'}});
 const [appearance,setAppearance]=useState<Appearance>(()=>{try{const mode=localStorage.getItem('vonbot.appearance');return mode==='colorblind'||mode==='high-contrast'?mode:'default'}catch{return 'default'}});
 useEffect(()=>{try{localStorage.setItem('vonbot.appearance',appearance)}catch{}},[appearance]);
 useEffect(()=>{try{localStorage.setItem('vonbot.display',displayMode)}catch{}},[displayMode]);
 const [projectMenu,setProjectMenu]=useState<HTMLElement|null>(null);
 const [helpOpen,setHelpOpen]=useState(false),[creditsOpen,setCreditsOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[renameOpen,setRenameOpen]=useState(false),[newOpen,setNewOpen]=useState(false);
 const [newName,setNewName]=useState('Untitled program');
 const [renameText,setRenameText]=useState(project.name);
 const [selectedCell,setSelectedCell]=useState<number|null>(null),[breakpoints,setBreakpoints]=useState<Set<number>>(new Set());
 const [toast,setToast]=useState('');
 const bypassBreakpoint=useRef<number|null>(null),hadRunWaiting=useRef(false),fileInput=useRef<HTMLInputElement>(null);
 const preview=useMemo(()=>assemble(project.source,project.memorySize,project.extended),[project.source,project.memorySize,project.extended]);
 useEffect(()=>{if(location.hash.startsWith('#project='))history.replaceState(null,'',location.pathname+location.search);},[]);
 const updateMachine=useCallback((next:Machine)=>{machineRef.current=next;setMachine(next);},[]);
 const advanceMachine=useCallback((previous:Machine,next:Machine)=>{
   if(next===previous)return;
   historyRef.current.push(previous);if(historyRef.current.length>900)historyRef.current.shift();
   setHistorySize(historyRef.current.length);
   updateMachine(next);const id=++eventId.current;setArrivals({id,nodes:[]});setBranchCheckProgress({id,fraction:0});setMotion({id,previous,next});
 },[updateMachine]);
 const clearHistory=()=>{setPauseState(false);historyRef.current=[];setHistorySize(0);setMotion(null);setArrivals({id:0,nodes:[]});setBranchCheckProgress({id:0,fraction:0});};
 const changeProject=useCallback((patch:Partial<Project>,codeChange=true)=>{setProject(p=>({...p,...patch,modifiedAt:Date.now()}));if(codeChange){setPauseState(false);stepToken.current++;playback.current='idle';setStepping(false);setDirty(true);setRunning(false);clearHistory();}setSaving(true);setSaved(false);},[]);
 useEffect(()=>{if(!saving)return;const id=window.setTimeout(()=>{setSaved(saveProject(project));setSaving(false);},600);return()=>clearTimeout(id);},[project,saving]);
 const compile=useCallback(():Machine|null=>{if(preview.diagnostics.length){setToast(`Fix ${preview.diagnostics.length} assembly error${preview.diagnostics.length>1?'s':''} before running.`);return null;}const fresh=createMachine(preview,project.seed ?? Date.now(),project.extended);seededAtRun.current=false;updateMachine(fresh);clearHistory();setDirty(false);setSelectedCell(null);hadRunWaiting.current=false;return fresh;},[preview,project.seed,project.extended,updateMachine]);
 const ensureReady=()=>{
   const current=machineRef.current;
   const m=dirty||current.status==='error'?compile():current;
   if(!m)return null;
   // Time-seed precisely when execution begins, not when the editor loads.
   // Never reseed on Back → Step, which must replay the same RNG state.
   if(!seededAtRun.current){seededAtRun.current=true;const seeded={...m,rng:seedValue(project.seed ?? Date.now())};updateMachine(seeded);return seeded;}
   return m;
 };
 const cancelCycle=()=>{setPauseState(false);stepToken.current++;playback.current='idle';setStepping(false);};
 // Run/Step no longer use a fixed interval. The first FETCH starts immediately,
 // and each following phase starts when the previous orb reaches its destination.
 const advancePlayback=()=>{
   const m=machineRef.current;
   if(pauseFlag.current||playback.current==='idle'||editorMode!=='code')return;
   if(m.phase==='fetch'&&breakpoints.has(m.pc)&&bypassBreakpoint.current!==m.pc&&playback.current==='run'){
     playback.current='idle';setRunning(false);setToast(`Breakpoint at ${addressLabel(m.pc)}`);return;
   }
   bypassBreakpoint.current=null;
   if(m.steps>=15000){playback.current='idle';setRunning(false);setStepping(false);setToast('Execution stopped at 15,000 instructions.');return;}
   if(m.status==='waiting'&&!m.input.length){playback.current='idle';setRunning(false);setStepping(false);return;}
   const next=microstep(m);if(next===m){playback.current='idle';setRunning(false);setStepping(false);return;}
   advanceMachine(m,next);
   if(next.status==='waiting'){hadRunWaiting.current=playback.current==='run';playback.current='idle';setRunning(false);setStepping(false);}
   if(next.status==='halted'||next.status==='error'){playback.current='idle';setRunning(false);setStepping(false);}
   // Step means exactly ONE Fetch, Decode, or Execute transition.
   if(playback.current==='step')playback.current='idle';
 };
 const stopExecution=()=>{
   // Stop aborts the current transfer and shows the committed CPU state. Pause
   // freezes that transfer and can resume at the same on-screen position.
   cancelCycle();setRunning(false);setPauseState(false);
   ++eventId.current;setMotion(null);setArrivals({id:0,nodes:[]});
 };
 const togglePause=()=>{
   if(pauseFlag.current){
     setPauseState(false);
     if(playback.current==='run'&&(!motion||motion.id===settledMotion))requestAnimationFrame(()=>advancePlayback());
     return;
   }
   if(running||stepping||!!(motion&&motion.id!==settledMotion))setPauseState(true);
 };
 const toggleRun=()=>{
   if(editorMode!=='code')return;
   if(pauseFlag.current){
     setPauseState(false);
     if(playback.current==='run'&&(!motion||motion.id===settledMotion))requestAnimationFrame(()=>advancePlayback());
     return;
   }
   if(running)return;
   cancelCycle();const m=ensureReady();if(!m)return;
   if(m.status==='halted'){setToast('Program halted. Reset before running again.');return;}
   if(m.status==='waiting'&&!m.input.length)return;
   bypassBreakpoint.current=m.pc;playback.current='run';setRunning(true);advancePlayback();
 };
 const takeStep=()=>{
   if(editorMode!=='code'||running||stepping)return;
   cancelCycle();const m=ensureReady();if(!m)return;
   if(m.status==='halted'){return;}
   if(m.status==='waiting'&&!m.input.length)return;
   playback.current='step';setStepping(true);advancePlayback();
 };
 const onCheckProgress=(id:number,fraction:number)=>{
   if(eventId.current!==id)return;
   const step=Math.max(0,Math.min(6,Math.floor(fraction*6)));
   setBranchCheckProgress(p=>p.id===id&&Math.floor(p.fraction*6)===step?p:{id,fraction:step/6});
 };
 const onRailArrival=(id:number,destination:string,origin?:string)=>{
   if(eventId.current!==id)return;
   setArrivals(a=>a.id!==id?a:a.nodes.includes(destination)?a:{...a,nodes:[...a.nodes,destination,...(destination==='alu'&&origin==='pc'?['pcAlu']:[])]});
 };
 const onRailDepart=(id:number,destination:string,origin?:string)=>{
   if(eventId.current!==id)return;
   if(destination==='pc')setArrivals(a=>a.id!==id?a:{...a,nodes:[...new Set([...a.nodes,'pcTransferStarted'])]});
   if(origin==='pc'&&destination==='alu')setArrivals(a=>a.id!==id?a:{...a,nodes:[...new Set([...a.nodes,'pcDepart'])]});
 };
 const onRailComplete=(id:number)=>{
   if(eventId.current!==id)return;
   setSettledMotion(id);setArrivals(a=>a.id!==id?a:a.nodes.includes('complete')?a:{...a,nodes:[...a.nodes,'complete']});setStepping(false);
   if(playback.current!=='idle')requestAnimationFrame(()=>{if(eventId.current===id&&!pauseFlag.current)advancePlayback();});
 };
 const reset=()=>{setRunning(false);cancelCycle();if(compile())setToast('Program reset. CPU, input, and output cleared.');};
 const stepBack=()=>{
   setRunning(false);cancelCycle();
   if(dirty){setToast('Assemble your edited program before stepping backward.');return;}
   // Undo a single microstep, including RAM, I/O, CPU flags and RNG state.
   const last=historyRef.current.pop();
   if(!last){setToast('Already at the beginning of program history.');return;}
   setHistorySize(historyRef.current.length);
   updateMachine(last);hadRunWaiting.current=false;
   // Back is an instant history restore, never a reverse animation.
   ++eventId.current;setMotion(null);setSettledMotion(eventId.current);setArrivals({id:0,nodes:[]});
 };
 useEffect(()=>()=>{stepToken.current++;},[]);
 const sendInput=(n:number)=>{
   const previous=machineRef.current;const queued=enqueueInput(previous,n);if(queued===previous)return;
   if(editorMode!=='code')return;
   if(previous.status==='waiting'){
     // A waiting INP consumes the supplied number immediately: this is the
     // Input → Accumulator transfer students expect to SEE.
     const executed=microstep(queued);advanceMachine(previous,executed);
     if(hadRunWaiting.current){hadRunWaiting.current=false;playback.current='run';setRunning(true);}
   }else updateMachine(queued);
 };
 const replaceProject=(p:Project)=>{setRunning(false);cancelCycle();seededAtRun.current=false;setProject(p);updateMachine(createMachine(assemble(p.source,p.memorySize,p.extended),p.seed ?? Date.now(),p.extended));setDirty(false);setSelectedCell(null);setBreakpoints(new Set());clearHistory();setSaved(false);setSaving(true);};
 const loadFile=async(e:ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();replaceProject({...defaultProject(),name:file.name.replace(/\.(vasm|lmc|asm|txt)$/i,''),source:text});setToast(`Imported ${file.name}.`);}catch(err){setToast(err instanceof Error?err.message:'Cannot open file.');}e.target.value='';};
 const toggleBreakpoint=(n:number)=>setBreakpoints(prev=>{const next=new Set(prev);if(next.has(n))next.delete(n);else next.add(n);return next;});
 const copyLink=async()=>{setProjectMenu(null);const url=shareURL(project);try{await navigator.clipboard.writeText(url);setToast('Shareable project URL copied.');}catch{window.prompt('Copy project URL',url);}};
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(editorMode==='code'&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();toggleRun();}if(editorMode==='code'&&e.key==='F10'){e.preventDefault();takeStep();}if(editorMode==='code'&&e.altKey&&e.key==='ArrowLeft'){e.preventDefault();stepBack();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();setSaved(saveProject(project));setSaving(false);setToast('Saved locally.');}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);});
 // Render CPU values only after the token has reached the corresponding unit.
 // The actual machine remains authoritative; the presentation is a delayed view.
 const pending=motion&&motion.id!==settledMotion;
 const cycleComplete=!pending&&!running&&machine.status==='ready'&&machine.phase==='fetch'&&machine.activeAddress!==null;
 const rndAnimating=!!pending&&motion?.next.phase==='fetch'&&motion.previous.phase==='execute'&&machine.ir!==0&&((Math.floor(machine.ir/100)===9))&&!motion.reverse;
 const displayMachine=useMemo<Machine>(()=>{
   if(!motion||motion.id===settledMotion)return machine;
   return presentationMachine(machine,motion.reverse?motion.next:motion.previous,arrivals.id===motion.id?arrivals.nodes:[]);
 },[machine,motion,settledMotion,arrivals]);
 const currentLine=dirty?null:machine.activeAddress===null?null:machine.addressToLine[machine.activeAddress];
 const changeSize=(size:8|16|32|64)=>{
   const candidate={...project,memorySize:size,modifiedAt:Date.now()};
   const candidateAsm=assemble(candidate.source,size,candidate.extended);
   if(candidateAsm.diagnostics.length){setToast(`Cannot fit this program in ${size} addresses. Try a larger RAM size or edit the source.`);return;}
   replaceProject(candidate);

 };
 return <Box className={`app-root ${paused?'simulation-paused':''}`} data-accessibility={appearance}>
   <AppBar elevation={0} position="static" className="top-bar"><Toolbar className="top-toolbar">
     <Stack direction="row" alignItems="center" gap={1.1}><Box className="vonbot-logo-frame"><VonBotMark size={34}/></Box><Box><Typography fontWeight={900} sx={{fontSize:19,lineHeight:1.05,letterSpacing:"-.015em"}}>VonBot</Typography><Typography className="vonbot-subtitle">Meet Von. Your Little Computer.</Typography></Box></Stack>
     <Stack direction="row" alignItems="center" gap={1}><Tooltip title="Simulator settings"><IconButton sx={{color:'white'}} aria-label="Settings" onClick={()=>setSettingsOpen(true)}><SettingsOutlined/></IconButton></Tooltip><Tooltip title="VonBot commands"><IconButton sx={{color:'white'}} aria-label="Command reference" onClick={()=>setHelpOpen(true)}><HelpOutline/></IconButton></Tooltip><Tooltip title="Credits and original inspiration"><IconButton sx={{color:'white'}} aria-label="Credits" onClick={()=>setCreditsOpen(true)}><InfoOutlined/></IconButton></Tooltip></Stack>
   </Toolbar></AppBar>
   <Box className="project-toolbar">
     <Stack direction="row" alignItems="center" gap={1} minWidth={0}><Button size="small" variant="outlined" startIcon={<SettingsOutlined/>} sx={{bgcolor:'white'}} onClick={e=>setProjectMenu(e.currentTarget)}>Project</Button><Box minWidth={0}><Typography fontWeight={800} noWrap sx={{fontSize:12.5,maxWidth:300}}>{project.name}</Typography><Typography fontSize={10.5} color="text.secondary">{saving?'Saving…':saved?<><CheckCircle sx={{fontSize:10,verticalAlign:'-1px'}}/> Saved in browser</>:'Browser save unavailable'}</Typography></Box></Stack>
     <Stack direction="row" alignItems="center" gap={.7}>{dirty&&<Chip size="small" color="warning" label="Needs assembly"/>}<RamUsageMeter kinds={displayMachine.kinds}/></Stack>
   </Box>
   <Menu anchorEl={projectMenu} open={!!projectMenu} onClose={()=>setProjectMenu(null)}>
     <MenuItem onClick={()=>{setProjectMenu(null);setNewName('Untitled program');setNewOpen(true);}}><AddCircleOutline fontSize="small" sx={{mr:1}}/>New program…</MenuItem>
     <MenuItem onClick={()=>{setProjectMenu(null);setRenameText(project.name);setRenameOpen(true);}}><SettingsOutlined fontSize="small" sx={{mr:1}}/>Rename project</MenuItem>
     <MenuItem onClick={()=>{setProjectMenu(null);fileInput.current?.click();}}><UploadFile fontSize="small" sx={{mr:1}}/>Load program (.vasm)</MenuItem><Divider/>
     <MenuItem onClick={()=>{setProjectMenu(null);exportText(fileSafe(project.name)+'.vasm',project.source);}}><Download fontSize="small" sx={{mr:1}}/>Save program (.vasm)</MenuItem>
     <MenuItem onClick={copyLink}><ContentCopy fontSize="small" sx={{mr:1}}/>Copy shareable link</MenuItem>
   </Menu>
   <input ref={fileInput} type="file" accept=".vasm,.lmc,.asm,.txt" onChange={loadFile} style={{display:'none'}} aria-label="Load VonBot assembly source"/>
   <Box className="workspace-layout">
     <Card className="editor-panel" role="region" aria-label="Assembly Editor">
       <Box className="editor-heading"><Stack direction="row" alignItems="center" gap={.7}><Code sx={{color:'#1a66b5'}}/><Typography fontWeight={800} fontSize={16}>Assembly Editor</Typography></Stack><Stack direction="row" bgcolor="#edf3f8" borderRadius={2} p="2px"><Button size="small" variant={editorMode==='code'?'contained':'text'} onClick={()=>setEditorMode('code')} sx={{minWidth:65}}>Code</Button><Button size="small" variant={editorMode==='blocks'?'contained':'text'} onClick={()=>{setRunning(false);cancelCycle();setEditorMode('blocks');}} startIcon={<ViewModuleOutlined fontSize="small"/>} sx={{minWidth:80}}>Blocks</Button></Stack></Box>
       <Box className="editor-area">{editorMode==='code'?<CodeEditor source={project.source} onChange={source=>changeProject({source})} activeLine={currentLine} appearance={appearance}/>:<Box className="block-mode-message">Block coding is open over the CPU panel. Click Code editor to return.</Box>}</Box>
       {preview.warnings.length>0&&<Box className="warning-strip"><Alert severity="warning" sx={{py:0,fontSize:11}}>{preview.warnings.map(w=><div key={w.line}>Line {w.line}: {w.message}</div>)}</Alert></Box>}
       {preview.diagnostics.length>0&&<Box className="error-strip"><Alert severity="error" sx={{py:0,fontSize:11}}>{preview.diagnostics.slice(0,2).map(d=><div key={d.line}>Line {d.line}: {d.message}</div>)}</Alert></Box>}
       <Box className="editor-controls">
         <Button size="small" variant="outlined" startIcon={<AutoFixHighOutlined/>} disabled={editorMode==='blocks'} onClick={()=>{const formatted=formatAssembly(project.source);if(formatted!==project.source){changeProject({source:formatted});setToast('Assembly source formatted. Assemble to apply changes.');}else setToast('Assembly is already formatted.');}}>Format assembly</Button>
         <Button variant="contained" fullWidth size="small" startIcon={<Memory/>} endIcon={<ChevronRight/>} onClick={()=>{if(compile())setToast('Program assembled into RAM.');}}>Assemble into RAM</Button>
         <Box className="execution-buttons">
           <Tooltip title={paused?'Resume the frozen animation':'Run continuously until Halt, Input, or a breakpoint'}><Button size="small" color="success" variant="contained" onClick={toggleRun} disabled={(!paused&&(stepping||running||!!pending))||editorMode==='blocks'||machine.status==='halted'} startIcon={<PlayArrow/>}>{paused?'Resume':'Run'}</Button></Tooltip>
           <Tooltip title="Step: advance one CPU phase (Fetch → Decode → Execute). Shortcut F10"><Button size="small" color="inherit" variant="outlined" disabled={paused||stepping||running||!!pending||editorMode==='blocks'||(machine.status==='halted'&&!dirty)} onClick={()=>takeStep()} startIcon={<SkipNext/>}>Step</Button></Tooltip>
           <Tooltip title="Back: undo exactly one CPU phase, restoring CPU, RAM, input and output. Shortcut Alt+Left"><span><Button size="small" color="inherit" variant="outlined" disabled={historySize===0||dirty||editorMode==='blocks'} onClick={stepBack} startIcon={<Undo/>}>Back</Button></span></Tooltip>
           <Tooltip title="Reassemble and reset CPU and console"><IconButton aria-label="Reset CPU" size="small" onClick={reset}><Refresh/></IconButton></Tooltip>
           <Tooltip title="Stop the current execution and finish the animation immediately"><span><IconButton aria-label="Stop execution" disabled={!running&&!stepping&&!pending} size="small" onClick={stopExecution}><Stop/></IconButton></span></Tooltip>
           <Tooltip title={paused?'Resume animation from exactly where it stopped':'Pause the current animation and CPU without changing its state'}><span><IconButton aria-label={paused?'Resume execution':'Pause execution'} size="small" color={paused?'primary':'default'} disabled={!paused&&!running&&!stepping&&!pending} onClick={togglePause}>{paused?<PlayArrow/>:<Pause/>}</IconButton></span></Tooltip>
         </Box>
         <Stack direction="row" gap={.8} className="editor-settings"><FormControl size="small" fullWidth><InputLabel>RAM size</InputLabel><Select label="RAM size" value={project.memorySize} onChange={e=>changeSize(Number(e.target.value) as 8|16|32|64)}>{[8,16,32,64].map(n=><MenuItem key={n} value={n}>{n} addresses</MenuItem>)}</Select></FormControl><Box className={`speed-slider ${turbo?'turbo-active':''}`} aria-label="Live execution speed"><Stack direction="row" alignItems="center" gap={.5}><SpeedOutlined sx={{fontSize:16,color:"primary.main"}}/><Typography fontSize={10.5} fontWeight={800}>Speed</Typography><Typography fontSize={10.5} color="text.secondary" sx={{ml:"auto"}}>{turbo?'Turbo':`${Math.round(speed)} px/s`}</Typography></Stack><Slider size="small" min={MIN_VELOCITY} max={MAX_VELOCITY} step={5} value={speed} onChange={(_,value)=>setSpeed(value as number)} aria-label="Data flow speed, adjustable during execution" valueLabelDisplay="auto"/></Box></Stack>
       </Box>
     </Card>
     <Box className="middle-panel"><DataFlowPanel machine={displayMachine} displayMode={displayMode} cycleComplete={cycleComplete} randomAnimationId={rndAnimating?motion?.id:null} paused={paused} branchCheckProgress={branchCheckProgress.id===motion?.id?branchCheckProgress.fraction:null} resumedInput={!!pending&&motion?.previous.status==='waiting'} motion={motion} revealed={pending&&arrivals.id===motion?.id?arrivals.nodes:['decodeInbox','executeInbox','ir','ar','complete']} running={running} sendInput={sendInput} clearOutput={()=>updateMachine({...machineRef.current,output:[]})}/></Box>
     <MemoryPanel machine={displayMachine} displayMode={displayMode} setDisplayMode={setDisplayMode} blockMode={editorMode==='blocks'} selected={selectedCell} setSelected={setSelectedCell} breakpoints={breakpoints} toggleBreakpoint={toggleBreakpoint}/>
     <InputFocusOverlay active={machine.status==='waiting'&&!pending&&editorMode==='code'} />
     <FlowRails machine={machine} speed={speed} motion={motion} visible={editorMode==='code'} instant={turbo} paused={paused} onCheckProgress={onCheckProgress} onArrive={onRailArrival} onDepart={onRailDepart} onComplete={onRailComplete}/>
     {editorMode==='blocks'&&<BlockEditor source={project.source} onChange={source=>changeProject({source})} extended={project.extended} onClose={()=>setEditorMode('code')} activeLine={currentLine} machine={machine}/>}
   </Box>
   <Dialog open={newOpen} onClose={()=>setNewOpen(false)} fullWidth maxWidth="xs"><DialogTitle>New program</DialogTitle><DialogContent><Typography color="text.secondary" fontSize={13} sx={{mb:1}}>Start a blank VonBot program. Creating a new program replaces the current browser autosave. Use Project → Save program (.vasm) first if you want to keep a separate file.</Typography><TextField autoFocus label="Program name" margin="normal" fullWidth value={newName} slotProps={{htmlInput:{maxLength:150}}} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newName.trim()){replaceProject({...defaultProject(),name:newName.trim(),memorySize:project.memorySize,extended:project.extended,source:'; '+newName.trim()+'\nHLT'});setEditorMode('code');setNewOpen(false);}}}/></DialogContent><DialogActions><Button onClick={()=>setNewOpen(false)}>Cancel</Button><Button variant="contained" disabled={!newName.trim()} onClick={()=>{replaceProject({...defaultProject(),name:newName.trim(),memorySize:project.memorySize,extended:project.extended,source:'; '+newName.trim()+'\nHLT'});setEditorMode('code');setNewOpen(false);}}>Create program</Button></DialogActions></Dialog>
   <Dialog open={renameOpen} onClose={()=>setRenameOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Rename project</DialogTitle><DialogContent><TextField autoFocus label="Project name" margin="normal" fullWidth value={renameText} slotProps={{htmlInput:{maxLength:150}}} onChange={e=>setRenameText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&renameText.trim()){changeProject({name:renameText.trim()},false);setRenameOpen(false);}}}/></DialogContent><DialogActions><Button onClick={()=>setRenameOpen(false)}>Cancel</Button><Button variant="contained" disabled={!renameText.trim()} onClick={()=>{changeProject({name:renameText.trim()},false);setRenameOpen(false);}}>Save</Button></DialogActions></Dialog>
   <Dialog open={settingsOpen} onClose={()=>setSettingsOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Simulator settings</DialogTitle><DialogContent><Stack gap={2} mt={1}><FormControl fullWidth size="small"><InputLabel>Random seed behavior</InputLabel><Select label="Random seed behavior" value={project.seed===null?'time':'manual'} onChange={e=>changeProject({seed:e.target.value==='time'?null:Math.floor(Date.now()%4294967296),seedMode:e.target.value==='time'?'time':'manual'},false)}><MenuItem value="time">Time-based · new sequence each run (default)</MenuItem><MenuItem value="manual">Manual · repeatable sequence</MenuItem></Select></FormControl>
    {project.seed!==null?<TextField size="small" label="Manual seed" type="number" value={project.seed} onChange={e=>changeProject({seed:Number.isFinite(Number(e.target.value))?Number(e.target.value):0},false)} helperText="Enter an integer. Use the same seed to reproduce a random sequence."/>:<Alert severity="info">RND generates a different sequence each time you start a new run. Set a manual seed when you want repeatable results for debugging.</Alert>}<Alert severity="info">Memory and the accumulator store 0000–9999. Instructions use OOAA (two-digit opcode, two-digit operand), with unique opcodes 00–12; 13–19 are reserved. Arithmetic wraps at 10000. SUB sets the borrow flag used by BRP. Both data and instructions occupy the same RAM.</Alert><Box className="appearance-settings" role="group" aria-label="Visual accessibility appearance"><Typography variant="subtitle2" fontWeight={850} sx={{mb:1}}>Accessibility appearance</Typography><Typography fontSize={12} color="text.secondary" sx={{mb:1}}>Choose one palette. Each option uses text, borders, and symbols as well as color. High contrast also uses colorblind-safe differences. Your preference is saved in this browser.</Typography><Stack direction="row" gap={1} flexWrap="wrap" role="group" aria-label="Accessibility appearance">{([['default','Default'],['colorblind','Colorblind'],['high-contrast','High contrast']] as const).map(([value,label])=><Button key={value} aria-pressed={appearance===value} size="small" variant={appearance===value?'contained':'outlined'} onClick={()=>setAppearance(value)}>{label}</Button>)}</Stack><Typography fontSize={12} sx={{mt:1}} role="status">Selected: {appearance==='default'?'Default':appearance==='colorblind'?'Colorblind':'High contrast'}.</Typography></Box><Box sx={{borderTop:'1px solid',borderColor:'divider',pt:1}}><Typography fontWeight={800} fontSize={13}>Keyboard controls</Typography><Typography fontSize={12} color="text.secondary">Tab and Shift+Tab move between controls. Enter or Space activates buttons. F10 steps one CPU phase; Alt+Left steps back; Ctrl/Cmd+Enter runs; Ctrl/Cmd+S saves.</Typography></Box></Stack></DialogContent><DialogActions><Button variant="contained" onClick={()=>setSettingsOpen(false)}>Done</Button></DialogActions></Dialog>
   <CommandReferenceDialog open={helpOpen} onClose={()=>setHelpOpen(false)}/>
   <CreditsDialog open={creditsOpen} onClose={()=>setCreditsOpen(false)}/>
   <Snackbar open={!!toast} autoHideDuration={4200} onClose={()=>setToast('')} anchorOrigin={{vertical:'bottom',horizontal:'center'}}><Alert onClose={()=>setToast('')} severity="info">{toast}</Alert></Snackbar>
 </Box>;
}
