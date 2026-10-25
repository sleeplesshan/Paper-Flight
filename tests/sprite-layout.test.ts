import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPlayerLayout,playerPoses,spriteFrameAt} from '../src/sprite-layout';

test('all eight shipped manifests have valid rectangles and loop timing',()=>{
 for(const id of ['1','2','3','4','5','6','6b','7']){
  const manifest=JSON.parse(readFileSync(`public/assets/players/${id}-sheet.json`,'utf8'));
  const layout=readPlayerLayout(manifest,1024,768);
  for(const pose of playerPoses){const sequence=layout[pose];assert.equal(sequence.total,500);assert.equal(spriteFrameAt(sequence,0),0);assert.equal(spriteFrameAt(sequence,.125),1);assert.equal(spriteFrameAt(sequence,.499),3);assert.equal(spriteFrameAt(sequence,.5),0)}
 }
});
test('reject out-of-bounds frames, zero durations and a displaced pivot',()=>{
 const original=JSON.parse(readFileSync('public/assets/players/3-sheet.json','utf8'));
 for(const mutate of [(m:any)=>m.frame_layout.rows.idle[0].x=1024,(m:any)=>m.animation.rows.move_left.durations_ms[2]=0,(m:any)=>m.game.pivot=[120,128]]){
  const m=structuredClone(original);mutate(m);assert.throws(()=>readPlayerLayout(m,1024,768));
 }
});
