import { useEffect, useMemo, useRef, useState } from 'react';
import { decode } from '../core/assembler';
import { timedRoutes, branchHoldBudgetMs } from '../core/animationTiming';
import { BASE_VELOCITY, DEFAULT_VELOCITY, advanceAnimationClock } from '../core/liveSpeed';
export { railDistance, timedRoutes } from '../core/animationTiming';
import { visiblePhase, transferPlan, pointOnRail } from '../core/flowModel';
export { transferPlan, pointOnRail } from '../core/flowModel';
import type { Machine } from '../core/machine';

export type FlowTransition = { id: number; previous: Machine; next: Machine; reverse?: boolean };
import type { FlowTransfer } from '../core/flowModel';
type Transfer = FlowTransfer;
type Point = { x: number; y: number };
type Geometry = { width: number; height: number; points: Record<string, Point>; leftLane: number; rightLane: number; bridgeY: number; ioY: number; topY: number; bottomY: number };
type Route = Transfer & { id: string; d: string; color: string; startMs: number; endMs: number };

const get = (root: Element,name:string,side:'left'|'right'|'top'|'bottom'='left'):Point|null => {
  const target=root.querySelector(`[data-flow-node="${name}"]`);
  if(!target)return null;
  const r=target.getBoundingClientRect(), base=root.getBoundingClientRect();
  const x=side==='left'?r.left:side==='right'?r.right:r.left+r.width/2;
  const y=side==='top'?r.top:side==='bottom'?r.bottom:r.top+r.height/2;
  return {x:x-base.left,y:y-base.top};
};
function measure():Geometry|null {
  const root=document.querySelector('.workspace-layout'), middle=root?.querySelector('.middle-panel'), memory=root?.querySelector('.memory-panel');
  if(!root||!middle||!memory)return null;
  const r=root.getBoundingClientRect(),mid=middle.getBoundingClientRect(),ram=memory.getBoundingClientRect();
  const points:Record<string,Point>={};
  for(const id of ['pc','control','decode','decodeInbox','decodeJunction','execute','executeInbox','ir','ar','acc','alu','input','output']) {
    for(const side of ['left','right','top','bottom'] as const) {const p=get(root,id,side);if(p)points[`${id}-${side}`]=p;}
  }
  root.querySelectorAll<HTMLElement>('[data-memory-address]').forEach(el=>{
    const rect=el.getBoundingClientRect();points[`cell${el.dataset.memoryAddress}`]={x:rect.left-r.left+1,y:rect.top-r.top+rect.height/2};
  });
  const execute=middle.querySelector('.execute-card')?.getBoundingClientRect();
  const io=middle.querySelector('.teaching-io')?.getBoundingClientRect();
  const ramGrid=memory.querySelector('.memory-grid')?.getBoundingClientRect();
  return {width:r.width,height:r.height,points,leftLane:mid.left-r.left-14,rightLane:(mid.right+ram.left)/2-r.left,
    bridgeY:(execute?.top ?? mid.top+mid.height*.6)-r.top-5,ioY:(io?.top??mid.bottom)-r.top-6,
    topY:(ramGrid?.top??ram.top)-r.top+30,bottomY:(ramGrid?.bottom??ram.bottom)-r.top-16};
}
const f=(n:number)=>Math.round(n*10)/10;
const fmt=(p:Point)=>`${f(p.x)},${f(p.y)}`;
function route(t:Transfer,g:Geometry):string|null {
  const p=g.points;
  const mem=(name:string)=>name==='memoryInstruction'||name==='memoryOperand';
  const at=(name:string,side:'left'|'right'|'top'|'bottom'):Point|undefined=>p[`${name}-${side}`];
  const resolve=(name:string,side:'left'|'right'|'top'|'bottom')=>mem(name)?p[name]:at(name,side);
  const from=t.from,to=t.to;
  // RAM transfers stay on the full-height bus BETWEEN the CPU and RAM panels.
  if(mem(from)||mem(to)) {
    const a=resolve(from,mem(from)?'left':'right'),b=resolve(to,mem(to)?'left':'right');
    if(!a||!b)return null;
    if(from==='acc'&&mem(to)) {
      const left=at('acc','left');if(!left)return null;
      return `M${fmt(left)} H${f(g.leftLane)} V${f(g.bridgeY)} H${f(g.rightLane)} V${f(b.y)} H${f(b.x)}`;
    }
    if(mem(from)&&to==='acc') {
      const left=at('acc','left');if(!left)return null;
      return `M${fmt(a)} H${f(g.rightLane)} V${f(g.bridgeY)} H${f(g.leftLane)} V${f(left.y)} H${f(left.x)}`;
    }
    return `M${fmt(a)} H${f(g.rightLane)} V${f(b.y)} H${f(b.x)}`;
  }
  if(from==='decode'&&to==='executeInbox') {
    // Travel entirely in the OPEN GUTTER between the two phase cards,
    // then enter Execute from ABOVE rather than crossing its header/Accumulator.
    const a=at('decode','bottom'),b=at('executeInbox','top');if(!a||!b)return null;
    const gutterY=f(a.y + Math.max(4,(b.y-a.y)*.38));
    return `M${fmt(a)} V${gutterY} H${f(b.x)} V${f(b.y)}`;
  }
  // The decode connector forms one T: an incoming stem reaches its centre;
  // both register branches begin at EXACTLY the same junction coordinates.
  // Take measurements from the flexible gap, not hard-coded offsets: on a
  // shorter laptop this gap shrinks without leaving a break in the rails.
  const fork=()=>{
    const top=at('decodeJunction','top');
    const bottom=at('decodeJunction','bottom');
    if(!top||!bottom)return null;
    return {x:top.x,y:f(top.y+(bottom.y-top.y)*0.57)};
  };
  if(from==='decodeInbox'&&to==='decodeJunction') {
    const a=at('decodeInbox','bottom'),j=fork();if(!a||!j)return null;
    // The word arrives from the upper-right inbox, crosses ABOVE the T,
    // then descends to the central junction before it splits.
    const entranceY=f(Math.min(j.y-9,Math.max(a.y+5,j.y-17)));
    return `M${fmt(a)} V${entranceY} H${f(j.x)} V${f(j.y)}`;
  }
  if(from==='decodeJunction'&&(to==='ir'||to==='ar')) {
    const j=fork(),b=at(to,'top');if(!j||!b)return null;
    return `M${fmt(j)} H${f(b.x)} V${f(b.y)}`;
  }
  if(from==='pc'&&to==='control') {
    // Lift the FETCH rail above both cards to clearly show the counter
    // traveling to the Control Unit, as on the original computer.
    const a=at('pc','top'),b=at('control','top');if(!a||!b)return null;
    const high=f(Math.min(a.y,b.y)-11);
    return `M${fmt(a)} V${high} H${f(b.x)} V${f(b.y)}`;
  }
  if(from==='decodeInbox'&&to==='ir'||from==='decodeInbox'&&to==='ar') {
    const a=at('decodeInbox','bottom'),b=at(to,'top');if(!a||!b)return null;
    return `M${fmt(a)} V${f(a.y+5)} H${f(b.x)} V${f(b.y)}`;
  }
  // Route ALU, Input and Output around the cards in the LEFT gutter, not over text.
  const io=from==='input'||to==='input'||from==='output'||to==='output';
  const a=at(from,io&&from==='input'?'top':io&&from==='output'?'top':'left');
  const b=at(to,io&&to==='input'?'top':io&&to==='output'?'top':'left');
  if(!a||!b)return null;
  if(io) {
    if(from==='input'||from==='output')return `M${fmt(a)} V${f(g.ioY)} H${f(g.leftLane)} V${f(b.y)} H${f(b.x)}`;
    return `M${fmt(a)} H${f(g.leftLane)} V${f(g.ioY)} H${f(b.x)} V${f(b.y)}`;
  }
  return `M${fmt(a)} H${f(g.leftLane)} V${f(b.y)} H${f(b.x)}`;
}
function microTransitionIsRandom(motion:FlowTransition){return !motion.reverse && motion.previous.phase==='execute' && decode(motion.next.ir).mnemonic==='RND';}
const COLORS={FETCH:'#0aa8ff',DECODE:'#08c982',EXECUTE:'#08bbff',READY:'#8297ab'};
/** Actual coordinate-based animation. Every orb travels at the same linear speed,
 * regardless of route length. The parent receives arrival events so registers,
 * RAM writes, and output can become visible at the moment data reaches them. */
export default function FlowRails({machine,speed,motion,visible=true,instant=false,paused=false,onCheckProgress,onArrive,onDepart,onComplete}:{
  machine:Machine;speed:number;motion:FlowTransition|null;visible?:boolean;instant?:boolean;paused?:boolean;
  onCheckProgress?:(motionId:number,fraction:number)=>void;
  onArrive?:(motionId:number,destination:string,origin?:string)=>void;
  onDepart?:(motionId:number,destination:string,origin?:string)=>void;
  onComplete?:(motionId:number)=>void;
}){
  const [geometry,setGeometry]=useState<Geometry|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const raf=useRef(0);
  const speedRef=useRef(speed);speedRef.current=speed;
  const pausedRef=useRef(paused);pausedRef.current=paused;
  const [reducedMotion,setReducedMotion]=useState(()=>typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const instantRef=useRef(instant||reducedMotion);instantRef.current=instant||reducedMotion;
  const latest=useRef({onArrive,onDepart,onComplete,onCheckProgress});latest.current={onArrive,onDepart,onComplete,onCheckProgress};
  useEffect(()=>{
    const update=()=>setGeometry(measure());update();
    const root=document.querySelector('.workspace-layout');
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    if(root&&observer){observer.observe(root);root.querySelectorAll('.middle-panel,.memory-panel,.memory-grid,.teaching-flow,.teaching-io,[data-flow-node="decodeInbox"],[data-flow-node="executeInbox"]').forEach(e=>observer.observe(e));}
    const scroll=root?.querySelector('.memory-scroll');
    window.addEventListener('resize',update);scroll?.addEventListener('scroll',update);
    return()=>{observer?.disconnect();window.removeEventListener('resize',update);scroll?.removeEventListener('scroll',update);cancelAnimationFrame(raf.current);};
  },[machine.memory.length]);
  // Re-measure positions when the phase ribbon becomes a completion/halt banner.
  // A ResizeObserver does not fire for elements that MOVE without resizing.
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>setGeometry(measure()));
    return()=>cancelAnimationFrame(frame);
  },[machine.phase,machine.status,motion?.id]);
  const target=motion?.reverse?motion.previous:motion?.next;
  const phase=target?visiblePhase(target):visiblePhase(machine);
  const routes=useMemo(()=>{
    if(!geometry||!motion)return [] as Route[];
    const state=motion.reverse?motion.previous:motion.next;
    const old=motion.reverse?motion.next:motion.previous;
    const pieces=transferPlan(state,old);
    const paths=pieces.flatMap((part,i)=>{
      const adjusted:Transfer=motion.reverse?{...part,from:part.to,to:part.from,start:1-part.start-part.length}:part;
      const inst=decode(state.ir);
      const cells={...geometry.points,
        memoryInstruction:geometry.points[`cell${state.activeAddress??state.pc}`],
        memoryOperand:geometry.points[`cell${inst.operand??0}`]};
      const d=route(adjusted,{...geometry,points:cells});
      return d?[{...adjusted,d,id:`${motion.id}-${i}`,color:COLORS[phase]}]:[];
    });
    const times=timedRoutes(paths,BASE_VELOCITY);
    return paths.map((part,i)=>({...part,...times[i]}));
  },[geometry,motion,phase]);
  const totalDuration=routes.length?Math.max(...routes.map(r=>r.endMs))+90:140;
  const routeRef=useRef(routes);routeRef.current=routes;
  useEffect(()=>{
    cancelAnimationFrame(raf.current);
    if(!motion||!geometry)return;
    const id=motion.id;
    if(!visible){setElapsed(totalDuration);latest.current.onComplete?.(id);return;}
    let previousFrame=performance.now(),progress=0;const seen=new Set<string>(),departed=new Set<string>();setElapsed(0);
    // A time-based 1-second RND scramble must stay one second even while the
    // user moves the speed slider. Hold the rail clock after the mnemonic
    // arrives, then let the generated result move to the Accumulator.
    const rnd=microTransitionIsRandom(motion);
    const rndAt=rnd?routeRef.current.find(r=>r.to==='executeInbox')?.endMs:null;
    const aluIn=routeRef.current.filter(r=>r.to==='alu');
    // An ALU result is not instant. The incoming value must ARRIVE first;
    // then a small processing interval makes the equation/branch decision visible.
    // Express delay in virtual clock units so changing speed works live.
    const incoming=aluIn.filter(r=>r.from!=='pc');
    const branchCheck=['BRZ','BRP'].includes(decode(motion.next.ir).mnemonic)&&motion.previous.phase==='execute'&&!motion.reverse;
    const aluHolds=incoming.length?[{at:Math.max(...incoming.map(x=>x.endMs)),budget:branchCheck?branchHoldBudgetMs():380*DEFAULT_VELOCITY/BASE_VELOCITY}]:[];
    const holds=[...(rndAt===undefined||rndAt===null?[]:[{at:rndAt,budget:1000,realTime:true}]), ...aluHolds.map(h=>({...h,realTime:false}))].sort((a,b)=>a.at-b.at);
    let holdIndex=0,remaining=0;let branchReadySent=false;
    const tick=(now:number)=>{
      const delta=now-previousFrame;previousFrame=now;
      if(pausedRef.current){raf.current=requestAnimationFrame(tick);return;}
      if(instantRef.current){setElapsed(totalDuration);latest.current.onComplete?.(id);return;}
      const h=holds[holdIndex];
      if(h&&remaining>0){
        // RND always scrambles one real second; ALU duration follows the slider.
        remaining-=h.realTime?Math.max(0,delta):advanceAnimationClock(0,delta,speedRef.current);
        if(branchCheck&&h.at===aluHolds[0]?.at){
          const fraction=Math.max(0,Math.min(1,(h.budget-remaining)/h.budget));
          latest.current.onCheckProgress?.(id,fraction);
          if(fraction>=2/3&&!branchReadySent){branchReadySent=true;latest.current.onArrive?.(id,'aluReady','alu');}
        }
        if(remaining<=0){holdIndex++;progress+=0.01;}
      } else {
        const proposed=advanceAnimationClock(progress,delta,speedRef.current);
        if(h&&progress<=h.at&&proposed>=h.at){progress=h.at;remaining=h.budget;}
        else progress=proposed;
      }
      const passed=Math.min(totalDuration,progress);
      setElapsed(passed);
      for(const r of routeRef.current){
        if(passed>=r.startMs&&!departed.has(r.id)){departed.add(r.id);latest.current.onDepart?.(id,r.to,r.from);}
        if(passed>=r.endMs&&!seen.has(r.id)){
          seen.add(r.id);latest.current.onArrive?.(id,r.to,r.from);
          if(r.to==='alu'&&r.from==='acc')latest.current.onArrive?.(id,'aluAccumulator','acc');
          if(r.to==='alu'&&r.from==='memoryOperand')latest.current.onArrive?.(id,'aluMemory','memoryOperand');
          if(r.to==='alu'&&r.from!=='pc'){
            const inputs=routeRef.current.filter(x=>x.to==='alu'&&x.from!=='pc');
            if(inputs.every(x=>seen.has(x.id))&&!branchCheck)latest.current.onArrive?.(id,'aluReady','alu');
          }
        }}
      if(passed<totalDuration||holdIndex<holds.length)raf.current=requestAnimationFrame(tick);
      else latest.current.onComplete?.(id);
    };
    raf.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf.current);
  // A geometry resize may update the routes mid-transfer; don't restart animation.
  },[motion?.id,geometry!==null,visible]);
  const base=useMemo(()=>{
    if(!geometry)return [] as string[];
    const p=geometry.points;const find=(from:string,to:string)=>{
      const d=route({from,to,value:'',start:0,length:1},geometry);return d?[d]:[];
    };
    // One physical rail per connection: bidirectional orbs can use the same pipe.
    // Eliminates the doubled lines near the accumulator and Program Counter.
    const lines=['pc|control','pc|alu','acc|alu','input|acc','acc|output','decode|executeInbox','decodeInbox|decodeJunction','decodeJunction|ir','decodeJunction|ar'].flatMap(s=>find(...(s.split('|') as [string,string])));
    const address=machine.activeAddress??0;
    const g={...geometry,points:{...p,memoryInstruction:p[`cell${address}`]}};
    for(const [from,to] of [['control','memoryInstruction'],['memoryInstruction','decodeInbox']] as const){
      const d=route({from,to,value:'',start:0,length:1},g);if(d)lines.push(d);
    }
    lines.push(`M${f(geometry.rightLane)},${f(geometry.topY)} V${f(geometry.bottomY)}`);
    return lines;
  },[geometry,machine.activeAddress]);
  if(!geometry)return null;
  return <>
    <svg className="lmc-rails-back" width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true" style={{visibility:visible?'visible':'hidden'}}>
      {base.map((d,i)=><path key={i} d={d} className="rail-base"/>)}
      {routes.filter(t=>elapsed<t.endMs&&elapsed>=t.startMs).map(t=><path key={t.id} d={t.d} className="rail-lit" stroke={t.color}/>)}
    </svg>
    <svg className="lmc-orb-front" width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true" style={{visibility:visible?'visible':'hidden'}}>
      <defs><filter id="lmc-orb-glow" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {!instant&&!reducedMotion&&routes.map(t=> <Orb key={t.id} route={t} elapsed={elapsed}/>)}
    </svg>
  </>;
}
function Orb({route:track,elapsed}:{route:Route;elapsed:number}){
  if(elapsed<track.startMs||elapsed>track.endMs)return null;
  const duration=Math.max(1,track.endMs-track.startMs);
  const fraction=(elapsed-track.startMs)/duration;
  const at=pointOnRail(track.d,fraction);
  const r=track.value.length>3?22:18;
  // Tokens remain one size. A separate green pulse on the Accumulator card
  // acknowledges completed writes (including INP, LDA, LDI, RND, ADD and SUB).
  return <g transform={`translate(${at.x} ${at.y})`} className="lmc-travel-token">
    <circle r={r+7} fill={track.color} opacity=".3" filter="url(#lmc-orb-glow)"/>
    <circle r={r} fill="#0078e9" stroke="#fff" strokeWidth="3" filter="url(#lmc-orb-glow)"/>
    <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="white" fontFamily="ui-monospace,monospace" fontWeight="900" fontSize={track.value.length>3?11:13}>{track.value}</text>
  </g>;
}
