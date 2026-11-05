import assert from 'node:assert/strict';
import {lineClick,snapDrawingPoint} from '../src/drawing.ts';
import {resolveDraft,type Draft} from '../src/geometry.ts';
assert.deepEqual(snapDrawingPoint({x:2.31,y:-1.29},[],50),{x:2,y:-1});
assert.deepEqual(snapDrawingPoint({x:.18,y:1.07},[],50),{x:0,y:1});
assert.deepEqual(snapDrawingPoint({x:2.48,y:1.52},[],50),{x:2.5,y:1.5});
assert.deepEqual(snapDrawingPoint({x:2.2,y:1.1},[{x:2.5,y:1}],50),{x:2.5,y:1});
assert.deepEqual(snapDrawingPoint({x:2.2,y:1.1},[{x:2.5,y:1}],50,0),{x:2,y:1});
let d:Draft={points:[],edges:[]},pending:number|null=null;
for(const p of [{x:0,y:0},{x:3,y:0},{x:3,y:0},{x:3,y:3},{x:3,y:3},{x:0,y:0}]){const r=lineClick(d,pending,p);d=r.draft;pending=r.pending;}
assert.equal(d.points.length,3);assert.equal(d.edges.length,3);assert.equal(pending,null);assert.equal(resolveDraft(d).error,'');
const a=lineClick({points:[{x:1,y:1},{x:2,y:2}],edges:[]},null,{x:1,y:1});
const b=lineClick(a.draft,a.pending,{x:2,y:2});assert.deepEqual(b.draft.edges,[[0,1]]);assert.equal(b.pending,null);
assert.equal(lineClick(b.draft,0,{x:2,y:2}).draft.edges.length,1);
console.log('✓ 정수·축·기존 점 스냅, 이동 제외, 두 점 선분, 재사용·닫기·중복 방지');
