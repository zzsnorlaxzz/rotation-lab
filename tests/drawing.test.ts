import assert from 'node:assert/strict';
import {lineClick,snapDrawingPoint} from '../src/drawing.ts';
import {fromArc,updateArc,removeArc,resolveDraft,type Draft} from '../src/geometry.ts';
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

let mixed=fromArc({x:0,y:0},2,180);const rawArc=structuredClone(mixed);
let r=lineClick(mixed,null,mixed.points[0]);r=lineClick(r.draft,r.pending,{x:0,y:0});mixed=r.draft;
assert.ok(mixed.circle);assert.equal(mixed.points.length,98);assert.equal(mixed.edges.length,97);assert.equal(resolveDraft(mixed).closed,false);
r=lineClick(mixed,null,{x:0,y:0});r=lineClick(r.draft,r.pending,mixed.points[96]);mixed=r.draft;
assert.equal(resolveDraft(mixed).error,'');assert.equal(mixed.edges.length,98);
const edited=updateArc(mixed,{...mixed.circle!,radius:3});assert.equal(edited.points[0].y,-3);assert.equal(edited.points[96].y,3);assert.deepEqual(edited.edges,mixed.edges);assert.equal(resolveDraft(edited).error,'');
assert.deepEqual(removeArc(mixed),{points:[{x:0,y:0}],edges:[]});assert.equal(resolveDraft(rawArc).closed,false);
const chord=lineClick(rawArc,0,rawArc.points[96]).draft;assert.equal(resolveDraft(chord).error,'');
console.log('✓ 호 다음 선분, 중심 연결, 명시적 닫기, 호 수정 시 선분 유지, 호 삭제');
