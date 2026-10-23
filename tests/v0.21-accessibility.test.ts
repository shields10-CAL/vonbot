import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=(relative:string)=>readFileSync(fileURLToPath(new URL(`../${relative}`,import.meta.url)),'utf8');

describe('v0.21 accessibility and overflow fixes',()=>{
 it('keeps dedicated columns for the Program Counter number and label',()=>{
   const css=source('src/styles/vonbot-v021.css');
   expect(css).toContain('grid-template-columns:18px minmax(0,1fr) auto');
   expect(css).toContain('grid-column:3!important');
   expect(css).toContain('text-overflow:ellipsis!important');
 });
 it('keeps Decode registers and handoff inside reserved regions',()=>{
   const css=source('src/styles/vonbot-v021.css');
   expect(css).toContain('.decode-registers');
   expect(css).toContain('minmax(0,1fr) minmax(0,1fr)');
   expect(css).toContain('.decode-explanation');
 });
 it('supports keyboard, non-color memory types and three exclusive palettes',()=>{
   const css=source('src/styles/vonbot-v021.css');
   expect(css).toContain('focus-visible');
   expect(css).toContain('.memory-cell.dat{border:2px dashed');
   expect(css).toContain('.memory-cell.data{border:2px dotted');
   const app=source('src/App.tsx');
   expect(app).toContain("'colorblind'");
   expect(app).toContain("'high-contrast'");
   expect(app).toContain('aria-pressed={appearance===value}');
 });
 it('exposes dynamic CPU/Memory status and reduces orb animation for reduced-motion users',()=>{
   expect(source('src/components/DataFlowPanel.tsx')).toContain('aria-atomic="true"');
   expect(source('src/components/MemoryPanel.tsx')).toContain('kindNames[machine.kinds[n]]');
   expect(source('src/components/FlowRails.tsx')).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
 });
});
