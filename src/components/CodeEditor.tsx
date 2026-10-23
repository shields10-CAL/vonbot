import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { autocompletion, completionStatus } from '@codemirror/autocomplete';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Box } from '@mui/material';
import { INSTRUCTIONS } from '../data/instructions';

const opcodes = INSTRUCTIONS.map(item=>item.op);
const lmcLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/(;|\/\/).*/)) return 'comment';
    if (stream.match(/\b(?:ADD|SUB|STA|STO|LDI|LDA|BRA|BRZ|BRP|INP|OUT|OUTC|OTC|RND|HLT|DAT|\.ORG)\b/i)) return 'keyword';
    if (stream.match(/\b\d+\b/)) return 'number';
    if (stream.match(/\b[A-Za-z_][\w]*:?/)) return 'variableName';
    stream.next(); return null;
  },
});
const normalColors = HighlightStyle.define([
  { tag: tags.keyword, color: '#155caf', fontWeight: '700' },
  { tag: tags.number, color: '#7f39b7' },
  { tag: tags.variableName, color: '#a75421' },
  { tag: tags.comment, color: '#388451', fontStyle: 'italic' },
]);
const accessibleColors = {
  colorblind: HighlightStyle.define([
    {tag:tags.keyword,color:'#00558c',fontWeight:'800'},
    {tag:tags.number,color:'#935300',fontWeight:'800'},
    {tag:tags.variableName,color:'#6a3e7f',fontWeight:'700'},
    {tag:tags.comment,color:'#176b51',fontStyle:'italic'},
  ]),
  'high-contrast': HighlightStyle.define([
    {tag:tags.keyword,color:'#78d3ff',fontWeight:'800'},
    {tag:tags.number,color:'#ffe077',fontWeight:'800'},
    {tag:tags.variableName,color:'#ffb9e8',fontWeight:'700'},
    {tag:tags.comment,color:'#9ff4c5',fontStyle:'italic'},
  ]),
};
const hints = autocompletion({ override: [(ctx) => {
  const before = ctx.matchBefore(/[A-Za-z.]+/);
  if (!before || (!ctx.explicit && before.from === before.to)) return null;
  return { from: before.from, options: opcodes.map(label => { const item=INSTRUCTIONS.find(i=>i.op===label)!; return {label, type:'keyword', detail:item.description, info:item.long}; }) };
}] });
// Indent successive assembly statements under the opcode column after a label.
// Enter repeats the prior indentation; ordinary Backspace removes it normally.
export const assemblyEnterIndent = keymap.of([{key:'Enter', run(view){
  // Let CodeMirror accept a highlighted autocomplete suggestion normally.
  if(completionStatus(view.state)==='active')return false;
  const selected=view.state.selection.main;
  if(!selected.empty)return false;
  const line=view.state.doc.lineAt(selected.from);
  const text=line.text;
  const label=/^(\s*)([A-Za-z_][\w]*:)(\s*)/.exec(text);
  const indent=label? ' '.repeat(label[1].length+label[2].length+Math.max(1,label[3].length)) : (/^\s*/.exec(text)?.[0]??'');
  const insert='\n'+indent;
  view.dispatch({changes:{from:selected.from,insert},selection:{anchor:selected.from+insert.length},scrollIntoView:true});
  return true;
}}]);
const theme = EditorView.theme({ '&': { fontSize: '13px', height: '100%' }, '.cm-content': { padding: '12px 0' }, '.cm-line': { padding: '0 12px' } });

export default function CodeEditor({ source, onChange, activeLine, readOnly = false, appearance='default' }: { source: string; onChange: (code: string) => void; activeLine: number | null; readOnly?: boolean; appearance?: 'default'|'colorblind'|'high-contrast' }) {
  const viewRef = useRef<EditorView | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [marker,setMarker] = useState<{y:number;h:number;x:number;w:number}|null>(null);
  const extensions = useMemo(() => [lmcLanguage, syntaxHighlighting(appearance==='default'?normalColors:accessibleColors[appearance]), hints, assemblyEnterIndent, EditorView.contentAttributes.of({'aria-label':'Assembly source code editor', 'aria-description':'Use arrow keys to navigate code. Type instructions or press Control+Space for command suggestions.'}), lineNumbers({formatNumber: n=>String(n-1)}), theme], [appearance]);
  const positionMarker = useCallback(() => {
    const view=viewRef.current, wrapper=wrapRef.current;
    if(!view || !wrapper || !activeLine || activeLine<1 || activeLine>view.state.doc.lines){setMarker(null);return;}
    const line=view.state.doc.line(activeLine);
    // Use the rendered CodeMirror line element instead of coordsAtPos().
    // Character coordinates refer to the text glyph, not the full visual line;
    // that made the old outline cross through the opcode text.
    // domAtPos can return a text node or an element inside the line.
    const dom=view.domAtPos(line.from).node;
    const el=(dom instanceof Element?dom:dom.parentElement)?.closest('.cm-line');
    if(!el){setMarker(null);return;}
    const rect=el.getBoundingClientRect();
    const wrap=wrapper.getBoundingClientRect();
    const x=Math.max(0,rect.left-wrap.left);
    setMarker({y:rect.top-wrap.top,h:rect.height,x,w:Math.min(rect.width,wrap.width-x-3)});
  },[activeLine]);
  useEffect(() => {
    const view=viewRef.current;
    if(!view || !activeLine || activeLine<1 || activeLine>view.state.doc.lines){positionMarker();return;}
    const line=view.state.doc.line(activeLine);
    // Scroll the executing line into view without moving the typing cursor.
    view.dispatch({effects:EditorView.scrollIntoView(line.from,{y:'nearest'})});
    const id=requestAnimationFrame(positionMarker);
    return()=>cancelAnimationFrame(id);
  },[activeLine,positionMarker,source]);
  useEffect(()=>{
    const view=viewRef.current,wrapper=wrapRef.current;
    if(!view||!wrapper)return;
    const scroll=()=>positionMarker();
    view.scrollDOM.addEventListener('scroll',scroll,{passive:true});
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(scroll);
    observer?.observe(wrapper);observer?.observe(view.contentDOM);
    return()=>{view.scrollDOM.removeEventListener('scroll',scroll);observer?.disconnect();};
  },[positionMarker]);
  return <Box ref={wrapRef} className="lmc-code-editor" sx={{height:'100%',overflow:'hidden',position:'relative'}}>
    <CodeMirror value={source} onChange={onChange} editable={!readOnly} extensions={extensions} basicSetup={{ foldGutter:false, lineNumbers:false, highlightActiveLine:true, highlightActiveLineGutter:true }} onCreateEditor={(view) => {viewRef.current=view; requestAnimationFrame(positionMarker);}} />
    {marker && <div className="lmc-current-instruction" aria-hidden="true" style={{height:marker.h,left:marker.x,width:marker.w,transform:`translate3d(0,${marker.y}px,0)`}}/>}
  </Box>;
}
