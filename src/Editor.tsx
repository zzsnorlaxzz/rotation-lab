import {useEffect,useRef,useState} from 'react';
import {arcRadius,fromArc,dragArcEndpoint,type CircleSpec,type Draft,type Point} from './geometry';
export type Tool='point'|'line'|'arc'|'move'|'erase';
export default function Editor({draft,tool,valid,closed,revision,onChange,onCheckpoint,onMessage,compact=false}:{draft:Draft;tool:Tool;valid:boolean;closed:boolean;revision:number;compact?:boolean;onChange:(d:Draft)=>void;onCheckpoint:()=>void;onMessage:(m:string)=>void}){
 const svg=useRef<SVGSVGElement>(null),drag=useRef<number|null>(null),[pending,setPending]=useState<number|null>(null),[hover,setHover]=useState<Point|null>(null);
 const [circlePreview,setCirclePreview]=useState<CircleSpec|null>(null),circleDrag=useRef<{kind:'new'|'center'|'radius'|'arc';endpoint?:'start'|'end';start:Point;circle:CircleSpec}|null>(null);
 useEffect(()=>{setPending(null);drag.current=null;circleDrag.current=null;setCirclePreview(null);},[tool,revision]);
 const screen=(p:Point)=>({x:410+p.x*48,y:350-p.y*48});
 function locate(ev:React.PointerEvent,snap=true){const m=svg.current!.getScreenCTM()!.inverse(),p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(m);const raw={x:(p.x-410)/48,y:(350-p.y)/48};return snap?{x:Math.round(raw.x*2)/2,y:Math.round(raw.y*2)/2}:raw;}
 function near(p:Point){return draft.points.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<.24);}
 function down(ev:React.PointerEvent<SVGSVGElement>){
  if(draft.circle&&(tool==='arc'||tool==='move')){const c=draft.circle,raw=locate(ev,false),start=c.startDegrees??-(c.sweepDegrees??180)/2,end=start+(c.sweepDegrees??180),threshold=18/(48*Math.max(.1,svg.current!.getScreenCTM()!.a));
   const hits=(['start','end'] as const).map(endpoint=>{const t=(endpoint==='start'?start:end)*Math.PI/180;return {endpoint,distance:Math.hypot(raw.x-c.center.x-c.radius*Math.cos(t),raw.y-c.center.y-c.radius*Math.sin(t))};}).sort((a,b)=>a.distance-b.distance);
   const radiusHit=tool==='move'&&Math.hypot(raw.x-c.center.x-c.radius,raw.y-c.center.y)<=threshold;if(hits[0].distance<=threshold&&!radiusHit){circleDrag.current={kind:'arc',endpoint:hits[0].endpoint,start:raw,circle:c};setCirclePreview(c);svg.current!.setPointerCapture(ev.pointerId);return;}
  }
  const p=locate(ev),i=near(p);if(p.x<0){onMessage('회전축 위 또는 오른쪽에 점을 놓아 주세요.');return;}if(p.x>8||Math.abs(p.y)>6)return;
  if(tool==='arc'){
   if(Math.min(8-p.x,6-Math.abs(p.y))<.5){onMessage('모눈 가장자리에서 한 칸 이상 떨어진 곳에 중심을 놓아 주세요. 회전축 위에도 놓을 수 있어요.');return;}
   const circle={center:p,radius:0,sweepDegrees:180};circleDrag.current={kind:'new',start:p,circle};setCirclePreview(circle);svg.current!.setPointerCapture(ev.pointerId);return;
  }
  if(draft.circle){const c=draft.circle,dist=Math.hypot(p.x-c.center.x,p.y-c.center.y),handle=Math.hypot(p.x-c.center.x-c.radius,p.y-c.center.y);
   if(tool==='erase'){if(dist<.4||Math.abs(dist-c.radius)<.4){onCheckpoint();onChange({points:[],edges:[]});}return;}
   if(tool==='move'&&(dist<.4||handle<.4)){circleDrag.current={kind:dist<.4?'center':'radius',start:p,circle:c};setCirclePreview(c);svg.current!.setPointerCapture(ev.pointerId);return;}
   onMessage('파란 끝점을 원둘레를 따라 드래그해 호를 그리세요. 중심과 반지름은 선택·이동 도구로 수정할 수 있어요.');return;
  }
  if(tool==='move'){if(i>=0){onCheckpoint();drag.current=i;svg.current!.setPointerCapture(ev.pointerId);}return;}
  if(tool==='erase'){
   if(i>=0){onCheckpoint();onChange({points:draft.points.filter((_,j)=>i!==j),edges:draft.edges.filter(e=>!e.includes(i)).map(([a,b])=>[a>i?a-1:a,b>i?b-1:b])});setPending(null);return;}
   const index=draft.edges.findIndex(([a,b])=>{const A=draft.points[a],B=draft.points[b],dx=B.x-A.x,dy=B.y-A.y,t=Math.max(0,Math.min(1,((p.x-A.x)*dx+(p.y-A.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-A.x-t*dx,p.y-A.y-t*dy)<.25;});
   if(index>=0){onCheckpoint();onChange({...draft,edges:draft.edges.filter((_,j)=>j!==index)});}setPending(null);return;
  }
  if(tool==='point'){if(i>=0)return;onCheckpoint();onChange({...draft,points:[...draft.points,p]});return;}
  const index=i<0?draft.points.length:i;
  if(pending===index){setPending(null);return;}
  if(pending!==null&&draft.edges.some(([a,b])=>a===pending&&b===index||b===pending&&a===index)){setPending(index);return;}
  if(pending!==null&&[pending,index].some(n=>draft.edges.filter(e=>e.includes(n)).length>=2)){onMessage('한 점에는 선분 두 개까지 연결할 수 있습니다.');setPending(null);return;}
  if(i<0||pending!==null){onCheckpoint();onChange({points:i<0?[...draft.points,p]:draft.points,edges:pending!==null?[...draft.edges,[pending,index]]:draft.edges});}
  if(pending!==null&&draft.edges.filter(e=>e.includes(index)).length===1)setPending(null);else setPending(index);
 }
 function move(ev:React.PointerEvent){const p=locate(ev);setHover(p);const cd=circleDrag.current;if(cd){if(cd.kind==='arc'){setCirclePreview(dragArcEndpoint(cd.circle,locate(ev,false),cd.endpoint!));}else if(cd.kind==='center'){const r=cd.circle.radius,center={x:Math.max(0,Math.min(8-r,cd.circle.center.x+p.x-cd.start.x)),y:Math.max(-6+r,Math.min(6-r,cd.circle.center.y+p.y-cd.start.y))};setCirclePreview({...cd.circle,center,radius:r});}else{setCirclePreview({...cd.circle,radius:arcRadius(cd.circle.center,p)});}return;}if(drag.current===null)return;if(p.x<0){onMessage('회전축 반대편으로 이동할 수 없습니다.');return;}if(p.x>8||Math.abs(p.y)>6)return;if(draft.points.some((q,j)=>j!==drag.current&&q.x===p.x&&q.y===p.y))return;onChange({...draft,points:draft.points.map((q,i)=>i===drag.current?p:q)});}
 function up(ev:React.PointerEvent){drag.current=null;if(circleDrag.current){if(circlePreview&&circlePreview.radius>=.5){onCheckpoint();onChange(fromArc(circlePreview.center,circlePreview.radius,circlePreview.sweepDegrees??180,circlePreview.startDegrees));}else onMessage('중심에서 바깥쪽으로 드래그해 반지름 0.5 이상의 반원을 그리세요.');circleDrag.current=null;setCirclePreview(null);}if(svg.current?.hasPointerCapture(ev.pointerId))svg.current.releasePointerCapture(ev.pointerId);}
 const shownCircle=circlePreview??draft.circle;
 return <svg ref={svg} className={'editor tool-'+tool} viewBox={compact?"260 30 580 640":"0 0 1000 700"} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;circleDrag.current=null;setCirclePreview(null);}} onPointerLeave={()=>setHover(null)} aria-label="모눈 평면. 회전축 오른쪽을 클릭하거나 드래그하여 도형을 그리세요.">
  <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse" x="410" y="350"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e3e9ed" strokeWidth=".8"/></pattern><pattern id="gridMajor" width="48" height="48" patternUnits="userSpaceOnUse" x="410" y="350"><rect width="48" height="48" fill="url(#grid)"/><path d="M48 0H0V48" fill="none" stroke="#d9e1e6" strokeWidth="1"/></pattern><marker id="axisArrow" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#697e87"/></marker></defs>
  <rect width="1000" height="700" fill="url(#gridMajor)"/><rect width="410" height="700" fill="#edf1f3" opacity=".45"/>
  <line x1="410" y1="655" x2="410" y2="57" stroke="#6e838c" strokeWidth="2" markerEnd="url(#axisArrow)"/><line x1="50" y1="350" x2="954" y2="350" stroke="#9bacb4" strokeWidth="1"/>
  <text x="426" y="66" className="axis-label">회전축 Y</text><text x="930" y="336" className="axis-label">반지름</text><text x="391" y="373" className="grid-label">0</text>
  {[1,2,3,4,5,6,7,8,9,10,11].map(i=><text key={i} x={410+i*48} y="373" textAnchor="middle" className="grid-label">{i}</text>)}
  {[-5,-4,-3,-2,-1,1,2,3,4,5].map(i=><text key={i} x="393" y={355-i*48} textAnchor="end" className="grid-label">{i}</text>)}
  {!shownCircle&&closed&&<polygon points={draft.points.length?(()=>{const order=[0];let prev=-1,cur=0;for(let k=0;k<draft.points.length;k++){const e=draft.edges.find(e=>e.includes(cur)&&!e.includes(prev));if(!e)break;const n=e[0]===cur?e[1]:e[0];if(n===0)break;order.push(n);prev=cur;cur=n;}return order.map(i=>{const p=screen(draft.points[i]);return `${p.x},${p.y}`;}).join(' ');})():''} fill={valid?'#dc7951':'#de5667'} fillOpacity=".17"/>}
  {!shownCircle&&draft.edges.map(([a,b],i)=>{const A=screen(draft.points[a]),B=screen(draft.points[b]);return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={valid?'#cf6c46':'#9f7062'} strokeWidth="3.5" strokeLinecap="round"/>;})}
  {pending!==null&&draft.points[pending]&&hover&&tool==='line'&&<line x1={screen(draft.points[pending]).x} y1={screen(draft.points[pending]).y} x2={screen(hover).x} y2={screen(hover).y} stroke="#d98967" strokeDasharray="6 5" strokeWidth="2"/>}
  {!shownCircle&&draft.points.map((p,i)=>{const s=screen(p);return <g key={i}><circle cx={s.x} cy={s.y} r={pending===i?10:7} fill="white" stroke="#cb653e" strokeWidth={pending===i?3:2.5}/><circle cx={s.x} cy={s.y} r="2.5" fill="#cb653e"/><text x={s.x+13} y={s.y-13} className="point-label">{String.fromCharCode(65+i)}</text></g>;})}
  {shownCircle&&(()=>{const c=screen(shownCircle.center),r=shownCircle.radius*48,start=(shownCircle.startDegrees??-(shownCircle.sweepDegrees??180)/2)*Math.PI/180,end=start+(shownCircle.sweepDegrees??180)*Math.PI/180,A={x:c.x+r*Math.cos(start),y:c.y-r*Math.sin(start)},B={x:c.x+r*Math.cos(end),y:c.y-r*Math.sin(end)},curve=`M${A.x} ${A.y} A${r} ${r} 0 0 0 ${B.x} ${B.y}`;return <g pointerEvents="none"><circle cx={c.x} cy={c.y} r={r} fill="none" stroke="#a3b8c2" strokeWidth="1.2" strokeDasharray="4 6" opacity=".6"/><path d={curve+'Z'} fill="#dc7951" fillOpacity=".17" stroke="none"/><path d={curve} fill="none" stroke="#cf6c46" strokeWidth="3.5"/><line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#cf6c46" strokeWidth="2" strokeDasharray="6 4"/><line x1={c.x} y1={c.y} x2={c.x+r} y2={c.y} stroke="#b9917a" strokeWidth="1.5" strokeDasharray="5 4"/><circle cx={c.x} cy={c.y} r="7" fill="white" stroke="#cb653e" strokeWidth="2.5"/><path d={`M${c.x-12} ${c.y}H${c.x+12}M${c.x} ${c.y-12}V${c.y+12}`} stroke="#cb653e" strokeWidth="1"/><circle cx={c.x+r} cy={c.y} r="8" fill="white" stroke="#cb653e" strokeWidth="2.5"/><circle cx={A.x} cy={A.y} r="8" fill="#e9f6fa" stroke="#318bac" strokeWidth="3"/><circle cx={B.x} cy={B.y} r="8" fill="#e9f6fa" stroke="#318bac" strokeWidth="3"/><text x={B.x+14} y={B.y-11} className="arc-end-label">호 끝점 · 드래그</text><text x={c.x+13} y={c.y+23} className="point-label">중심</text><text x={c.x+r/2} y={c.y-13} textAnchor="middle" className="point-label">반지름 {shownCircle.radius}</text></g>;})()}
  {hover&&hover.x>=0&&hover.x<=8&&Math.abs(hover.y)<=6&&tool!=='erase'&&<circle cx={screen(hover).x} cy={screen(hover).y} r="5" fill="#cb653e" opacity=".35" pointerEvents="none"/>}
  <text x="180" y="605" className="muted-map-label" textAnchor="middle">↻</text><text x="180" y="636" className="axis-label" textAnchor="middle">회전축 오른쪽에 그려 주세요</text>
 </svg>;
}



