export type ScreenPoint={x:number;y:number};
/** Choose once at pointer-down, so a drag never changes its purpose mid-gesture. */
export function dragTarget(stage:number,pointer:ScreenPoint,handles:ScreenPoint[]):'rotate'|'view'{
 return (stage===1||stage===2)&&handles.some(h=>Math.hypot(h.x-pointer.x,h.y-pointer.y)<=22)?'rotate':'view';
}
export function draggedAngle(start:number,deltaX:number){return Math.max(0,Math.min(360,start+deltaX*.6));}
