export type Point = { x: number; y: number };
export type CircleSpec = { center: Point; radius: number; sweepDegrees?: number; startDegrees?: number };
export type Draft = { points: Point[]; edges: [number, number][]; circle?: CircleSpec };
export const examples: Record<string, Point[]> = {
  cylinder: [{x:0,y:-2},{x:3,y:-2},{x:3,y:2},{x:0,y:2}],
  cone: [{x:0,y:-2.5},{x:3,y:-2.5},{x:0,y:2.5}],
  tube: [{x:1.5,y:-2},{x:3.5,y:-2},{x:3.5,y:2},{x:1.5,y:2}],
};
export function fromPolygon(points: Point[]): Draft { return { points:points.map(p=>({...p})),edges:points.map((_,i)=>[i,(i+1)%points.length]) }; }
export function circleRadius(center:Point,p:Point){const limit=Math.min(center.x,8-center.x,6-Math.abs(center.y));return Math.max(0,Math.min(limit,Math.round(Math.hypot(p.x-center.x,p.y-center.y)*2)/2));}
/** Keep the circle editable as center/radius; sample only for the common sweep pipeline. */
export function fromCircle(center:Point,radius:number):Draft {
  if(!Number.isFinite(radius)||radius<=0||center.x-radius< -1e-9)throw new Error('원은 회전축 오른쪽에 있어야 합니다.');
  const points=Array.from({length:96},(_,i)=>{const t=i/96*Math.PI*2;return {x:Math.max(0,center.x+radius*Math.cos(t)),y:center.y+radius*Math.sin(t)};});
  return {...fromPolygon(points),circle:{center:{...center},radius}};
}
/** A right-facing circular arc closed by its chord, so the swept region is explicit. */
export function fromArc(center:Point,radius:number,sweepDegrees=180,startDegrees=-sweepDegrees/2):Draft {
  if(!Number.isFinite(radius)||radius<=0||center.x<0||!Number.isFinite(sweepDegrees)||sweepDegrees<30||sweepDegrees>180)throw new Error('호의 각도는 30°~180°, 반지름은 0보다 커야 합니다.');
  if(!Number.isFinite(startDegrees)||startDegrees< -90-1e-8||startDegrees+sweepDegrees>90+1e-8)throw new Error('호는 회전축 오른쪽 반원 안에 그려 주세요.');
  const points=Array.from({length:97},(_,i)=>{const t=(startDegrees+i/96*sweepDegrees)*Math.PI/180;const x=center.x+radius*Math.cos(t);return {x:Math.abs(x)<1e-10?0:x,y:center.y+radius*Math.sin(t)};});
  return {...fromPolygon(points),circle:{center:{...center},radius,sweepDegrees,startDegrees}};
}
/** Follow the pointer around the fixed circle; the opposite endpoint stays anchored. */
export function dragArcEndpoint(circle:CircleSpec,p:Point,endpoint:'start'|'end'):CircleSpec {
  const start=circle.startDegrees??-(circle.sweepDegrees??180)/2,end=start+(circle.sweepDegrees??180);
  if(Math.hypot(p.x-circle.center.x,p.y-circle.center.y)<1e-8)return circle;
  const pointerAngle=Math.max(-90,Math.min(90,Math.atan2(p.y-circle.center.y,p.x-circle.center.x)*180/Math.PI));
  const nextStart=endpoint==='start'?Math.max(-90,Math.min(end-30,pointerAngle)):start;
  const nextEnd=endpoint==='end'?Math.max(start+30,Math.min(90,pointerAngle)):end;
  return {...circle,startDegrees:nextStart,sweepDegrees:nextEnd-nextStart};
}
export function arcRadius(center:Point,p:Point){return Math.max(0,Math.min(8-center.x,6-Math.abs(center.y),Math.round(Math.hypot(p.x-center.x,p.y-center.y)*2)/2));}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function area(p:Point[]) { return p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0)/2; }
function on(a:Point,b:Point,p:Point){return Math.abs(cross(a,b,p))<1e-8 && p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8;}
export function intersects(a:Point,b:Point,c:Point,d:Point){ const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),z=cross(c,d,b);return (u*v<0&&w*z<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b); }
export function polygonError(p:Point[]) {
  if(p.length<3)return '서로 다른 점을 3개 이상 연결하세요.';
  if(p.some(p=>p.x<0))return '도형은 회전축 오른쪽에 그려 주세요.';
  for(let i=0;i<p.length;i++) for(let j=i+1;j<p.length;j++) {
    if(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)<1e-8)return '같은 위치에 점이 겹쳐 있습니다.';
    if(j===i+1||(i===0&&j===p.length-1))continue;
    if(intersects(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]))return '선분이 서로 교차하거나 닿습니다. 점을 옮겨 주세요.';
  }
  for(let i=0;i<p.length;i++){const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];if(Math.abs(cross(a,b,c))<1e-8 && ((a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y))>0)return '이웃한 선분이 겹쳐 있습니다.';}
  if(Math.abs(area(p))<1e-7)return '넓이가 없는 도형은 돌릴 수 없습니다.';
  return '';
}
export function resolveDraft(d:Draft):{polygon:Point[];order:number[];error:string;closed:boolean} {
  const fail=(error:string)=>({polygon:[],order:[],error,closed:false});
  if(d.points.length<3)return fail('점을 찍고 선분으로 연결해 도형을 완성하세요.');
  const adj=d.points.map(()=>[] as number[]);
  for(const [a,b] of d.edges){adj[a]?.push(b);adj[b]?.push(a);}
  if(adj.some(a=>a.length!==2))return fail('모든 점을 하나의 고리로 연결하세요. 첫 점을 누르면 닫힙니다.');
  const order=[0];let prev=-1,cur=0;
  for(let k=0;k<d.points.length;k++){const next=adj[cur].find(n=>n!==prev)!;if(next===0)break;if(order.includes(next))return fail('하나의 닫힌 다각형만 만들 수 있습니다.');order.push(next);prev=cur;cur=next;}
  if(order.length!==d.points.length)return fail('떨어져 있는 점이나 여러 도형이 있습니다.');
  const polygon=order.map(i=>d.points[i]),error=polygonError(polygon);
  return {polygon,order,error,closed:true};
}
/** Even–odd intersections of the drawn polygon with a horizontal line.
 * Each interval becomes one annulus (or disk), so concave polygons retain gaps. */
export function radialIntervals(p:Point[],height:number):[number,number][] {
  if(p.length<3)return [];
  const min=Math.min(...p.map(p=>p.y)),max=Math.max(...p.map(p=>p.y));
  if(height<min-1e-9||height>max+1e-9)return [];
  const y=Math.max(min+1e-8,Math.min(max-1e-8,height)),xs:number[]=[];
  p.forEach((a,i)=>{const b=p[(i+1)%p.length];if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));});
  xs.sort((a,b)=>a-b);const out:[number,number][]=[];
  for(let i=0;i+1<xs.length;i+=2)if(xs[i+1]-xs[i]>1e-8)out.push([Math.max(0,xs[i]),xs[i+1]]);
  return out;
}
export function rotated(p:Point,t:number):[number,number,number]{return [p.x*Math.cos(t),p.y,-p.x*Math.sin(t)];}
/** Only the swept angular interval is tessellated, never a hidden full primitive. */
export function sweepVertices(p:Point[],degrees:number):number[] {
  if(degrees<=0)return [];
  const theta=Math.min(360,degrees)*Math.PI/180,n=Math.max(1,Math.ceil(degrees/3)),out:number[]=[];
  const poly=area(p)<0?[...p].reverse():p;
  poly.forEach((a,i)=>{const b=poly[(i+1)%poly.length];for(let j=0;j<n;j++){const t=theta*j/n,u=theta*(j+1)/n,A=rotated(a,t),B=rotated(b,t),C=rotated(b,u),D=rotated(a,u);out.push(...A,...B,...C,...A,...C,...D);}});
  return out;
}
