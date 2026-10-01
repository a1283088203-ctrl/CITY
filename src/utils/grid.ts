import { CITY } from '../data/cityConfig';
export type Cell={x:number;z:number};
export const key=(p:Cell)=>`${p.x},${p.z}`;
export const fromKey=(s:string):Cell=>{const [x,z]=s.split(',').map(Number);return {x,z};};
export const inside=(p:Cell)=>p.x>=0&&p.z>=0&&p.x<CITY.size&&p.z<CITY.size;
export const neighbors=(p:Cell)=>[{x:p.x+1,z:p.z},{x:p.x-1,z:p.z},{x:p.x,z:p.z+1},{x:p.x,z:p.z-1}].filter(inside);
export const toWorld=(p:Cell)=>({x:(p.x+.5)*CITY.cell-CITY.half,z:(p.z+.5)*CITY.cell-CITY.half});
export const toCell=(x:number,z:number):Cell=>({x:Math.floor((x+CITY.half)/CITY.cell),z:Math.floor((z+CITY.half)/CITY.cell)});
