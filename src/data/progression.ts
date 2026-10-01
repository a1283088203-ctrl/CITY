export const STAGES=[
 {name:'RURAL',label:'农村',population:0,green:.95,motto:'河边有风，家里有灯。',bloom:.1,queueLevel:2},
 {name:'TOWNSHIP',label:'乡镇',population:300,green:.72,motto:'老屋旁，新的街角正在生长。',bloom:.2,queueLevel:2},
 {name:'URBAN',label:'城区',population:1500,green:.48,motto:'更多窗口，更多归家的人。',bloom:.32,queueLevel:2},
 {name:'METRO',label:'都市',population:7000,green:.24,motto:'灯火延长了这座城的一天。',bloom:.46,queueLevel:3},
 {name:'CYBERPUNK MEGACITY',label:'赛博朋克巨型城市',population:30000,green:.08,motto:'城市不再需要睡眠。',bloom:.62,queueLevel:3}
];

/** Early queues: level 1 = 60%, level 2 = 40%; later tiers keep their existing cap. */
export function rollBuildingLevel(queueLevel:number,maxLevel:number,random=Math.random){
 const max=Math.min(queueLevel,Math.max(2,maxLevel-1));
 return max<=2?(random()<.6?1:2):1+Math.floor(random()*max);
}
