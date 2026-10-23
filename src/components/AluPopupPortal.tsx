import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Mount the ALU equation at workspace level, ABOVE the full-workspace SVG
 * travel paths. Child stacking contexts cannot otherwise outrank an SVG sibling. */
export default function AluPopupPortal({children}:{children:ReactNode}){
  const [anchor,setAnchor]=useState<{left:number;top:number}|null>(null);
  useLayoutEffect(()=>{
    const workspace=document.querySelector<HTMLElement>('.workspace-layout');
    const alu=workspace?.querySelector<HTMLElement>('[data-flow-node="alu"]');
    if(!workspace||!alu)return;
    const popup=workspace.querySelector<HTMLElement>('.alu-popup-portal');
    const update=()=>{
      const outer=workspace.getBoundingClientRect();
      const inner=alu.getBoundingClientRect();
      // Center the rendered equation vertically on the ALU, rather than
      // placing its top edge 18px above the ALU (which caused the offset).
      const popupSize=popup?.getBoundingClientRect();
      const height=popupSize?.height||42;
      const width=popupSize?.width||175;
      const left=Math.max(2,Math.min(outer.width-width-2,inner.right-outer.left+13));
      const centerY=inner.top-outer.top+inner.height/2;
      const top=Math.max(2,Math.min(outer.height-height-2,centerY-height/2));
      setAnchor(old=>old&&Math.abs(old.left-left)<.5&&Math.abs(old.top-top)<.5?old:{left,top});
    };
    update();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    observer?.observe(workspace);observer?.observe(alu);
    if(popup)observer?.observe(popup);
    window.addEventListener('resize',update);
    return()=>{observer?.disconnect();window.removeEventListener('resize',update);};
  },[anchor!==null]);
  const root=document.querySelector<HTMLElement>('.workspace-layout');
  if(!root||!anchor)return null;
  return createPortal(<div className="alu-popup-portal" style={{left:anchor.left,top:anchor.top}}>{children}</div>,root);
}
