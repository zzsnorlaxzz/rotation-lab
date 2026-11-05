export type ScreenPoint={x:number;y:number};
/** Choose once at pointer-down, so a drag never changes its purpose mid-gesture. */
export function dragTarget(stage:number,pointer:ScreenPoint,handles:ScreenPoint[],surfaceHit=false):'rotate'|'view'{
 return (stage===1||stage===2)&&(surfaceHit||handles.some(h=>Math.hypot(h.x-pointer.x,h.y-pointer.y)<=32))?'rotate':'view';
}
export function draggedAngle(start:number,deltaX:number,viewportWidth?:number){const sensitivity=viewportWidth?360/Math.max(160,viewportWidth*.7):.6;return Math.max(0,Math.min(360,start+deltaX*sensitivity));}
