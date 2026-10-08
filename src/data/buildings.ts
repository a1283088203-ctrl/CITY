export interface BuildingData { level:number; mass:number; name:string; label:string; width:number; depth:number; height:number; population:number; livingSpace:number; color:number; roof:number }
export const BUILDINGS:BuildingData[] = [
 {level:1,mass:4,name:'Tiny House',label:'花园小屋',width:1.65,depth:1.65,height:1.2,population:4,livingSpace:48,color:0xf0d9ac,roof:0xdc795f},
 {level:2,mass:10,name:'Row House',label:'联排住宅',width:2,depth:1.8,height:1.7,population:12,livingSpace:38,color:0xe9b87e,roof:0x648b88},
 {level:3,mass:25,name:'Town Apartment',label:'街角公寓',width:2.25,depth:2,height:2.7,population:36,livingSpace:29,color:0xf0cb91,roof:0x477f84},
 // Levels 4–7: modern residences (white concrete, glazing between slabs, balconies) built by BuildingModern.ts.
 {level:4,mass:65,name:'Modern Apartments',label:'现代公寓',width:2.5,depth:2.3,height:4,population:120,livingSpace:21,color:0xece6dc,roof:0x7c8a8c},
 {level:5,mass:180,name:'Terrace Residence',label:'退台住宅',width:2.7,depth:2.5,height:6.5,population:500,livingSpace:14,color:0xe4e6e1,roof:0x6f7f82},
 {level:6,mass:340,name:'Glass Balcony Residence',label:'玻璃阳台住宅',width:2.8,depth:2.6,height:8.1,population:1050,livingSpace:11,color:0xdcdfdb,roof:0x66787c},
 {level:7,mass:470,name:'Sky Garden Residence',label:'空中花园住宅',width:2.9,depth:2.7,height:9,population:1450,livingSpace:10,color:0xcfd6d2,roof:0x53686c},
 // Levels 8–10: future residences (pearl towers, vertical glass, halo rings, glass skybridges) built by BuildingFuture.ts.
 {level:8,mass:650,name:'Skyline Residence',label:'天际住宅',width:3,depth:2.8,height:10,population:2000,livingSpace:9,color:0xeef0ec,roof:0xd5dcdc},
 {level:9,mass:1750,name:'Halo Arcology',label:'光环巨构',width:3.4,depth:3,height:15,population:8000,livingSpace:5.8,color:0xebeeeb,roof:0xd2d9da},
 {level:10,mass:4750,name:'Utopia Tower',label:'乌托邦之塔',width:3.8,depth:3.4,height:22,population:100000,livingSpace:3.2,color:0xf1f2ee,roof:0xd8dedd}
];
export const buildingData=(level:number)=>BUILDINGS[level-1];
/** Highest tier; it no longer merges. */
export const MAX_LEVEL=BUILDINGS.length;


