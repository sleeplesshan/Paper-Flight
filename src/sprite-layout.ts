export const playerPoses=['idle','move_left','move_right'] as const;
export type PlayerPose=typeof playerPoses[number];
export type SpriteRect={x:number,y:number,w:number,h:number};
export type SpriteSequence={rects:SpriteRect[],durations:number[],total:number};
export type PlayerLayout=Record<PlayerPose,SpriteSequence>;

// Reject bad metadata before creating canvases; malformed rectangles can sample
// a neighbour or silently display a blank sprite on Safari.
export function readPlayerLayout(value:unknown,width:number,height:number):PlayerLayout {
 const m=value as any;
 if(m?.frame_layout?.sheetWidth!==width||m?.frame_layout?.sheetHeight!==height||
    m?.game?.displaySize!==92||m?.game?.pivot?.[0]!==128||m?.game?.pivot?.[1]!==128)
  throw new Error('Player sprite dimensions or pivot do not match');
 const result={} as PlayerLayout;
 for(const pose of playerPoses){
  const rects=m.frame_layout.rows?.[pose],animation=m.animation?.rows?.[pose];
  if(!Array.isArray(rects)||rects.length!==4||animation?.frames!==4||animation?.loop!==true||
     !Array.isArray(animation.durations_ms)||animation.durations_ms.length!==4)
   throw new Error(`Missing player sprite sequence: ${pose}`);
  const durations:number[]=animation.durations_ms;
  for(let i=0;i<rects.length;i++){
   const r=rects[i];
   if(!r||![r.x,r.y,r.w,r.h].every(Number.isInteger)||r.x<0||r.y<0||r.w!==256||r.h!==256||
      r.x+r.w>width||r.y+r.h>height||!Number.isFinite(durations[i])||durations[i]<=0)
    throw new Error(`Invalid player sprite frame: ${pose}/${i}`);
  }
  result[pose]={rects,durations,total:durations.reduce((sum,n)=>sum+n,0)};
 }
 return result;
}

export function spriteFrameAt(sequence:Pick<SpriteSequence,'durations'|'total'>,seconds:number){
 let time=((seconds*1000)%sequence.total+sequence.total)%sequence.total;
 for(let i=0;i<sequence.durations.length;i++){if(time<sequence.durations[i])return i;time-=sequence.durations[i]}
 return sequence.durations.length-1;
}
