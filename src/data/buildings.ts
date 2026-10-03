export interface BuildingData { level:number; mass:number; name:string; label:string; width:number; depth:number; height:number; population:number; livingSpace:number; color:number; roof:number }
export const BUILDINGS:BuildingData[] = [
 {level:1,mass:4,name:'Tiny House',label:'花园小屋',width:1.65,depth:1.65,height:1.2,population:4,livingSpace:48,color:0xf0d9ac,roof:0xdc795f},
 {level:2,mass:10,name:'Row House',label:'联排住宅',width:2,depth:1.8,height:1.7,population:12,livingSpace:38,color:0xe9b87e,roof:0x648b88},
 {level:3,mass:25,name:'Town Apartment',label:'街角公寓',width:2.25,depth:2,height:2.7,population:36,livingSpace:29,color:0xf0cb91,roof:0x477f84},
 {level:4,mass:65,name:'Apartment Block',label:'城市住区',width:2.5,depth:2.3,height:4,population:120,livingSpace:21,color:0xa9c5b7,roof:0x416d78},
 {level:5,mass:180,name:'High-rise Residence',label:'垂直社区',width:2.7,depth:2.5,height:6.5,population:500,livingSpace:14,color:0x80aeb2,roof:0x36596e},
 {level:6,mass:650,name:'Mega Residential Tower',label:'超高层住宅',width:3,depth:2.8,height:10,population:2000,livingSpace:9,color:0x78918f,roof:0x354c50},
 {level:7,mass:1750,name:'Arcology Block',label:'巨构住宅',width:3.4,depth:3,height:15,population:8000,livingSpace:5.8,color:0x667c83,roof:0x2d414a},
 {level:8,mass:4750,name:'Utopia Tower',label:'乌托邦之塔',width:3.8,depth:3.4,height:22,population:100000,livingSpace:3.2,color:0x526a73,roof:0x263940}
];
export const buildingData=(level:number)=>BUILDINGS[level-1];


