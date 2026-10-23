/** Two seconds of branch thinking at default speed; the result then stays visible for one more second. */
export const BRZ_CHECK_DELAY_MS = 2000;

/** Orthogonal pipe lengths and fixed-velocity motion scheduling. */
export function railDistance(d:string):number {
  // All paths use orthogonal M/H/V segments, just like pointOnRail.
  const cmds=d.match(/[MHV]-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)?/g)??[];
  let x=0,y=0,total=0,first=true;
  for(const cmd of cmds){let nx=x,ny=y;
    if(cmd[0]==='M'){[nx,ny]=cmd.slice(1).split(',').map(Number);}
    if(cmd[0]==='H')nx=Number(cmd.slice(1));
    if(cmd[0]==='V')ny=Number(cmd.slice(1));
    if(!first)total+=Math.hypot(nx-x,ny-y);
    x=nx;y=ny;first=false;
  }
  return total;
}
export function timedRoutes<T extends {start:number;d:string}>(routes:T[],pixelsPerSecond:number):{startMs:number;endMs:number}[]{
  // Nearly concurrent transfers (e.g. both inputs to the ALU) start together.
  // All moving data travels at precisely the same linear px/s velocity.
  const indexed=routes.map((r,i)=>({...r,i})).sort((a,b)=>a.start-b.start);
  const result:{startMs:number;endMs:number}[]=new Array(routes.length);
  let cursor=0,i=0;
  while(i<indexed.length){const batch=[indexed[i++]];
    while(i<indexed.length && indexed[i].start-batch[0].start<=.065)batch.push(indexed[i++]);
    const max=Math.max(...batch.map(t=>railDistance(t.d)/pixelsPerSecond*1000));
    for(const t of batch)result[t.i]={startMs:cursor,endMs:cursor+railDistance(t.d)/pixelsPerSecond*1000};
    cursor+=max+90;
  }
  return result;
}


/** Two 1-second dot cycles, followed by a 1-second outcome hold at the default speed.
 * Budget is in animation-clock milliseconds; the live velocity slider scales it. */
export const BRANCH_THINK_CYCLES=2;
export const BRANCH_THINK_MS=BRZ_CHECK_DELAY_MS;
export const BRANCH_RESULT_MS=1000;
export const BRANCH_TOTAL_MS=BRANCH_THINK_MS+BRANCH_RESULT_MS;
export function branchHoldBudgetMs(defaultVelocity=230,baseVelocity=460):number{
  return BRANCH_TOTAL_MS*defaultVelocity/baseVelocity;
}
export function branchDots(fraction:number):string | null {
  if(fraction>=2/3)return null;
  const frame=Math.min(5,Math.floor(Math.max(0,fraction)*9));
  return '.'.repeat(frame%3+1);
}
