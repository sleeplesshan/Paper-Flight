import {test} from 'node:test';
import assert from 'node:assert/strict';
import {materialFor,feedbackSound,chooseVoiceVictim,soundPriority} from '../src/feedback';
import {Engine} from '../src/engine';
import {newRun} from '../src/data';
test('weapon materials describe real techniques rather than button slots',()=>{
 assert.equal(materialFor('log'),'wood');assert.equal(materialFor('missile'),'paper');assert.equal(materialFor('soundbomb'),'wind');assert.equal(materialFor('icebomb'),'ice');
 assert.equal(feedbackSound({kind:'launch',craft:'7',weapon:'log',level:3,x:0,y:0}),'pop-wood-launch');
});
test('critical sounds preempt low priority voices and preserve two slots',()=>{
 const shots=Array.from({length:6},(_,i)=>({priority:10,started:i}));assert.equal(chooseVoiceVictim(shots,10),0);assert.equal(chooseVoiceVictim(shots,95),-1);
 const full=[...shots,{priority:100,started:6},{priority:95,started:7}];assert.equal(chooseVoiceVictim(full,90),0);assert.equal(chooseVoiceVictim(full.map(v=>({...v,priority:100})),10),-2);
 assert.ok(soundPriority('warning')>soundPriority('pop-wood-launch'));
});
test('real hits, shield blocks and pickups produce transient events without changing restore data',()=>{
 const r=newRun(1,'7');r.mode='playing';r.spawn=99;r.growth.shield=1;const e=new Engine(r);e.add('small',500);r.enemies[0].x=500;r.enemies[0].y=350;r.enemies[0].hp=100;r.enemies[0].frozen=9;
 e.combat.basic();for(let i=0;i<30;i++)e.step(1/60,{x:0,y:0});assert.ok(e.feedback.some(f=>f.kind==='impact'&&f.weapon==='leaf'));assert.ok(r.effects.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));
 r.capsules.push({x:r.x,y:r.y,kind:'ice'});e.step(1/60,{x:0,y:0});assert.ok(e.feedback.some(f=>f.kind==='pickup'&&f.slot===1));const restored=new Engine(JSON.parse(JSON.stringify(r)));assert.deepEqual(restored.feedback,[]);
});
