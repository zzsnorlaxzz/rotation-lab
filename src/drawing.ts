import type {Draft,Point} from './geometry';
/** Existing vertices take priority; integer coordinates have a stronger magnetic range. */
export function snapDrawingPoint(raw:Point,points:Point[],pixelsPerUnit:number,exclude=-1):Point{
 const tolerance=Math.min(.4,18/Math.max(1,pixelsPerUnit));let best=-1,distance=tolerance;
 points.forEach((p,i)=>{const d=Math.hypot(raw.x-p.x,raw.y-p.y);if(i!==exclude&&d<distance){best=i;distance=d;}});
 if(best>=0)return {...points[best]};
 const axis=(v:number)=>Math.abs(v-Math.round(v))<=.34?Math.round(v):Math.round(v*2)/2;
 return {x:axis(raw.x),y:axis(raw.y)};
}
/** Each pair of clicks creates exactly one segment and releases the starting point. */
export function lineClick(draft:Draft,pending:number|null,p:Point):{draft:Draft;pending:number|null;error?:string}{
 const i=draft.points.findIndex(q=>q.x===p.x&&q.y===p.y),index=i<0?draft.points.length:i;
 if(pending===index)return {draft,pending:null};
 if(pending!==null){
  if(draft.edges.some(([a,b])=>a===pending&&b===index||a===index&&b===pending))return {draft,pending:null};
  if([pending,index].some(n=>draft.edges.filter(e=>e.includes(n)).length>=2))return {draft,pending:null,error:'한 점에는 선분 두 개까지 연결할 수 있습니다.'};
 }
 return {draft:{points:i<0?[...draft.points,p]:draft.points,edges:pending===null?draft.edges:[...draft.edges,[pending,index]]},pending:pending===null?index:null};
}
