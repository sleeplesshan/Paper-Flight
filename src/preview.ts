import {stages,W,H,type Run} from './data';
import {type Track} from './arsenal';
import {draw} from './render';
import {PreviewPlayback,previewBounds,type PreviewBounds} from './preview-model';

const sizes=new WeakMap<HTMLCanvasElement,{width:number;height:number;checked:number}>();
/** Both cameras fit the same real paths and preserve the artwork's proportions. */
export function drawPreview(canvas:HTMLCanvasElement,r:Run,bounds:PreviewBounds){
 const now=performance.now();let size=sizes.get(canvas);
 if(!size||now-size.checked>200){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);size={width:Math.max(1,Math.round(rect.width*dpr)),height:Math.max(1,Math.round(rect.height*dpr)),checked:now};sizes.set(canvas,size);}
 const {width,height}=size;
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 const ctx=canvas.getContext('2d')!,scale=Math.min(width/(bounds.right-bounds.left),height/(bounds.bottom-bounds.top));
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=stages[r.stage-1].color;ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate((width-(bounds.right-bounds.left)*scale)/2-bounds.left*scale,(height-(bounds.bottom-bounds.top)*scale)/2-bounds.top*scale);ctx.scale(scale,scale);draw(ctx,r,r.stage,0,true);ctx.restore();
}

/** Silent isolated combat; a sound gesture can arm the after-side callback once. */
export class UpgradePreview {
 private playback:PreviewPlayback;private bounds:PreviewBounds;private canvases:HTMLCanvasElement[];
 constructor(private source:Run,private track:Track,private root:HTMLElement){
  this.canvases=Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas'));
  this.bounds=previewBounds(source,track);this.playback=new PreviewPlayback(source,track);this.paint();
 }
 reset(){this.playback=new PreviewPlayback(this.source,this.track);}
 playSound(callback:()=>void){this.reset();this.playback.onAfterStart(callback);this.paint();}
 step(dt:number){if(this.playback.finished)this.reset();this.playback.step(dt);this.paint();}
 private paint(){
  this.playback.engines.forEach((e,i)=>{const canvas=this.canvases[i];if(canvas)drawPreview(canvas,e.r,this.bounds);});
  const state=this.playback.finished?'complete':this.playback.started?'playing':'ready';
  if(this.root.dataset.previewState!==state)this.root.dataset.previewState=state;
 }
}
