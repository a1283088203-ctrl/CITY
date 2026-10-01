export const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export const speed=(v:{x:number;y:number;z:number})=>Math.hypot(v.x,v.y,v.z);
export function seeded(seed:number){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
