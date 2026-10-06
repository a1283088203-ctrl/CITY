import {seeded} from './math';

/* Cloud mask for the mountain ring, generated at runtime so every new city gets a fresh sky.
 * CLOUD_W = the mountain texture (512px) x 3 repeats, so cloud and ridge pixels share one scale; rows line up
 * with the mountain texture. Channels: R = clouds between the far and mid ridges, G = between mid and near.
 * Value 128 is cloud body, 255 its sunlit upper lobe. Row 0 is the bottom (DataTexture orientation). */
export const CLOUD_W=1536,CLOUD_H=64;
type Puff={x:number;y:number;r:number};

/** One cloud with a flat base, built from the two approved silhouettes:
 * "humps" — a big dome beside a smaller, lower one on a flat slab (never an even row of domes),
 * "peak"  — one tall dome rising out of a skirt that steps wider towards the base (centred or leaning). */
function cloud(r:()=>number,cx:number,base:number,size:number){
 const form=Math.floor(r()*3),body:Puff[]=[];
 const add=(x:number,y:number,rad:number)=>body.push({x:cx+x*size,y:base+y*size,r:rad*size});
 // Flat slab under the domes: a row of low wide puffs whose tops form the cloud floor.
 const slab=(from:number,to:number,h:number)=>{for(let x=from;x<=to;x+=4)add(x,h-8,8);};
 if(form===0){
  const s=r()<.5?-1:1,big=8.5+r()*1.5,small=big*(.6+r()*.12);
  add(s*big*.55,5+r()*2,big);
  add(-s*(big*.55+small*1.25),1.5,small);
  slab(-s*(big*.55+small*2.2),s*(big*1.55+3),3);
 }else{
  const lean=form===2?(r()<.5?-1:1)*(4+r()*3):0;
  add(lean,10,7.5);add(lean*.6,4,9);
  for(const s of [-1,1])add(s*(9+r()*2)+lean*.3,1,6.5);
  const reach=17+r()*4;slab(-reach,reach,1.5);
 }
 // The sunlit lobe sits on the highest puff, offset towards the sun side.
 const top=body.reduce((a,p)=>p.y+p.r>a.y+a.r?p:a);
 const half=Math.max(...body.map(p=>Math.abs(p.x-cx)+p.r));
 return {cx,base,body,light:{x:top.x-top.r*.3,y:top.y+top.r*.35,r:top.r*.62},half};
}

/** Irregularly spaced clouds with wide gaps, so the ring never reads as one continuous band. */
function layer(r:()=>number,baseMin:number,baseMax:number,sizeMin:number,sizeMax:number,gapMin:number,gapMax:number){
 const start=r()*CLOUD_W,clouds:ReturnType<typeof cloud>[]=[];let x=start;
 for(;;){
  const size=sizeMin+r()*(sizeMax-sizeMin),c=cloud(r,0,baseMin+Math.floor(r()*(baseMax-baseMin)),size);
  const cx=x+c.half;if(cx+c.half>start+CLOUD_W-gapMin)break;
  c.body.forEach(p=>p.x+=cx);c.light.x+=cx;c.cx=cx;clouds.push(c);x=cx+c.half+gapMin+r()*(gapMax-gapMin);
 }
 return clouds;
}

export function cloudMask(seed:number){
 const r=seeded(seed),data=new Uint8Array(CLOUD_W*CLOUD_H*4);
 const inside=(p:Puff,x:number,y:number)=>{let d=Math.abs(x-p.x)%CLOUD_W;d=Math.min(d,CLOUD_W-d);return d*d+(y-p.y)*(y-p.y)<p.r*p.r;};
 const paint=(clouds:ReturnType<typeof layer>,channel:number)=>{
  for(const c of clouds)for(let dx=-Math.ceil(c.half+8);dx<=Math.ceil(c.half+8);dx++){
   const x=Math.round(c.cx)+dx,column=((x%CLOUD_W)+CLOUD_W)%CLOUD_W;
   for(let up=c.base;up<CLOUD_H;up++){
    if(!c.body.some(p=>inside(p,x,up)))continue;
    const i=(up*CLOUD_W+column)*4;data[i+channel]=Math.max(data[i+channel],inside(c.light,x,up)?255:128);data[i+3]=255;
   }
  }
 };
 // Both layers sit low near the horizon; the near layer's clouds are larger and sparser.
 paint(layer(r,19,24,.95,1.45,90,320),0);
 paint(layer(r,7,11,1.15,1.7,220,500),1);
 return data;
}
