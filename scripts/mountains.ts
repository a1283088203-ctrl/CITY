// Generates public/textures/mountains.png: a horizontally seamless, pixel-stepped ridge silhouette.
// Channels are layer masks (R far, G mid, B near) so the game tints them from the live fog/sky colors.
// Run: bun scripts/mountains.ts
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';

const W=512,H=64;
const seeded=(seed:number)=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};

/** Periodic ridge profile: integer frequencies keep x=0 and x=W identical. */
function ridge(seed:number,base:number,amp:number,sharp:number){
 const r=seeded(seed),waves=[2,3,5,7,11,17,29].map((k,i)=>({k,a:Math.pow(.62,i)*(.6+r()*.8),p:r()*Math.PI*2}));
 const total=waves.reduce((n,w)=>n+w.a,0);
 return Array.from({length:W},(_,x)=>{
  let v=0;for(const w of waves){const s=Math.sin(Math.PI*2*w.k*x/W+w.p);v+=w.a*((1-sharp)*s+sharp*(1-2*Math.abs(s)));}
  return Math.round(base+amp*v/total);
 });
}
// Far peaks are tallest and sharpest, near foothills low and rounded.
const layers=[ridge(17,38,34,.65),ridge(42,24,22,.45),ridge(91,12,12,.25)];

const rgba=new Uint8Array(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const up=H-1-y,i=(y*W+x)*4;
 layers.forEach((h,l)=>{if(up<h[x])rgba[i+l]=255;});
 rgba[i+3]=rgba[i]|rgba[i+1]|rgba[i+2]?255:0;
}

function png(width:number,height:number,data:Uint8Array){
 const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
 const crc=(b:Uint8Array)=>{let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
 const chunk=(type:string,body:Uint8Array)=>{const out=new Uint8Array(12+body.length),view=new DataView(out.buffer);
  view.setUint32(0,body.length);out.set(new TextEncoder().encode(type),4);out.set(body,8);view.setUint32(8+body.length,crc(out.subarray(4,8+body.length)));return out;};
 const header=new Uint8Array(13),hv=new DataView(header.buffer);hv.setUint32(0,width);hv.setUint32(4,height);header.set([8,6,0,0,0],8);
 const raw=new Uint8Array(height*(width*4+1));for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
 const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',new Uint8Array())];
 const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;
}
writeFileSync(new URL('../public/textures/mountains.png',import.meta.url),png(W,H,rgba));
console.log('wrote public/textures/mountains.png',W,'x',H);
