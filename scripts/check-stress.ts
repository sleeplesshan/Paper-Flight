import {growthCaps} from '../src/arsenal.ts';import {performance} from 'node:perf_hooks';import {writeFileSync,mkdirSync} from 'node:fs';import {Engine} from '../src/engine.ts';import {newRun,aircraft} from '../src/data.ts';
const results=[];
for(const c of aircraft){const r=newRun(10,c.id);r.mode='playing';r.growth={...growthCaps};r.ultimate.level=2;r.phase=1;r.spawn=999;r.auto=true;r.invuln=999;const e=new Engine(r);
 for(let i=0;i<24;i++){e.add('small',250+(i%6)*80);const n=r.enemies.at(-1)!;n.y=20+Math.floor(i/6)*65;n.hp=n.max=100000;n.frozen=100;n.shooter=i<6;} // Deliberately durable fixture, not used for balance claims.
 e.combat.ultimate();r.fire=0;r.supply.clock=0;
 for(let i=0;i<3;i++){r.fire=3;e.bomb('fire');e.bomb('ice')}
 const samples:number[]=[];let peak=0;for(let i=0;i<600;i++){const before=performance.now();e.step(1/60,{x:0,y:0});samples.push(performance.now()-before);peak=Math.max(peak,r.attacks.length+r.scheduled.length);e.events=[];}
 samples.sort((a,b)=>a-b);results.push({craft:c.id,p95Ms:+samples[570].toFixed(3),maxMs:+samples[599].toFixed(3),peakShots:peak,remainingGroups:r.groups.length});}
mkdirSync('validation-results',{recursive:true});writeFileSync('validation-results/stress-v4.json',JSON.stringify({method:'Node CPU engine-only, 600 steps, 24 durable frozen targets, fully upgraded, six simultaneous special casts, final ultimate and time-based supply. Not browser FPS or iPad performance.',results},null,2));console.log(JSON.stringify(results));
