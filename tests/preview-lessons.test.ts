import test from 'node:test';
import assert from 'node:assert/strict';
import {aircraft,newRun} from '../src/data';
import {growthCaps,type Track} from '../src/arsenal';
import {PreviewPlayback,previewBounds} from '../src/preview-model';

test('matched practice targets reveal real special and companion growth without changing the adventure',()=>{
 let count=0,improved=0;
 for(const craft of aircraft)for(const [key,cap] of Object.entries(growthCaps))for(let level=0;level<cap;level++){
  const track=key as Track,source=newRun(2,craft.id);source.growth[track]=level;
  if(track==='friend'&&level>=2)source.growth.basic=1;
  const original=JSON.stringify(source),lesson=new PreviewPlayback(source,track);
  assert.deepEqual(lesson.engines[0].r.enemies,lesson.engines[1].r.enemies,`${craft.id}/${track}/${level}: unmatched lesson`);
  while(!lesson.finished&&lesson.elapsed<10)lesson.step(1/60);
  assert.ok(lesson.finished,`${craft.id}/${track}/${level}: incomplete lesson`);
  const [before,after]=lesson.engines.map(engine=>engine.r.kills);
  assert.ok(after>=before,`${craft.id}/${track}/${level}: fewer targets cleared`);
  if(track.startsWith('special')||track==='friend')assert.ok(after>before,`${craft.id}/${track}/${level}: growth hidden by fragile targets`);
  if(after>before)improved++;
  assert.equal(JSON.stringify(source),original);
  count++;
 }
 assert.equal(count,152);
 // Shield lessons also teach blocking; equal kill totals need not mean failure.
 assert.ok(improved>=120,`${improved} lessons showed an additional cleared target`);
});

test('the common preview camera reserves its apron for root tips and wide logs, not departed straight shots',()=>{
 for(const craft of aircraft){const source=newRun(2,craft.id);source.growth.basic=2;
  assert.ok(previewBounds(source,'basic').top>=-30,`${craft.id}: empty offscreen travel shrinks the lesson`);
 }
 const tree=newRun(2,'7');tree.growth.special1=2;
 const bounds=previewBounds(tree,'special1');
 assert.ok(bounds.top<-30,'the actual tree tips retain room above the battlefield');
 assert.ok(bounds.left>=-200&&bounds.right<=1200&&bounds.bottom<=700);
});
