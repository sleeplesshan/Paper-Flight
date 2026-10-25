/** Floating joystick: the first finger owns movement until lifted/cancelled. */
export function setupTouch(game:HTMLElement,stick:HTMLElement,knob:HTMLElement,canMove:()=>boolean,onMove:(x:number,y:number)=>void,onGesture:()=>void){
 let pointer:number|null=null,originX=0,originY=0,radius=45;
 const reset=()=>{const old=pointer;pointer=null;stick.hidden=true;knob.style.transform='none';onMove(0,0);if(old!==null&&game.hasPointerCapture(old))game.releasePointerCapture(old)};
 game.addEventListener('pointerdown',e=>{if(!canMove()||pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;const target=e.target as HTMLElement;if(target.closest('button,input,dialog'))return;const box=game.getBoundingClientRect();if(e.clientX>box.left+box.width*.5||e.clientY<box.top+box.height*.075)return;e.preventDefault();onGesture();pointer=e.pointerId;originX=e.clientX;originY=e.clientY;radius=Math.max(32,Math.min(56,box.width*.04));const size=radius/0.3;stick.style.width=`${size}px`;stick.style.height=`${size}px`;stick.style.left=`${originX-box.left}px`;stick.style.top=`${originY-box.top}px`;stick.hidden=false;game.setPointerCapture(e.pointerId);onMove(0,0)});
 game.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();const x=(e.clientX-originX)/radius,y=(e.clientY-originY)/radius,length=Math.max(1,Math.hypot(x,y));onMove(x/length,y/length);knob.style.transform=`translate3d(${x/length*radius}px,${y/length*radius}px,0)`});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])game.addEventListener(name,e=>{if((e as PointerEvent).pointerId===pointer)reset()});
 const prevent=(e:Event)=>{if(!(e.target as HTMLElement).closest('input'))e.preventDefault()};
 for(const name of ['contextmenu','selectstart','dragstart','dblclick'])game.addEventListener(name,prevent);
 // Safari gesture events and touchmove are explicitly non-passive on the game surface.
 for(const name of ['gesturestart','gesturechange','gestureend'])game.addEventListener(name,prevent,{passive:false});
 game.addEventListener('touchmove',e=>{if(e.touches.length===1&&(e.target as HTMLElement).closest('#overlay.upgrade-screen,#overlay.aircraft-selection'))return;prevent(e)},{passive:false});
 window.addEventListener('resize',reset);window.addEventListener('blur',reset);
 return reset;
}
