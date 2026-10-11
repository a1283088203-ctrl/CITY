import * as T from 'three';
export type DayPhase='Morning'|'Day'|'Sunset'|'Night';
const FRAMES=[
 {hour:0,sky:0x172943,sun:0xb6d3ff,ambient:0xa0b9d2,power:.42,fill:.85,night:1},
 // Sunrise mirrors the sunset: night → the same warm peak → daylight, over the same spans.
 {hour:5,sky:0x172943,sun:0xb6d3ff,ambient:0xa0b9d2,power:.42,fill:.85,night:1},
 // Sunlight is ~30% stronger than the original tuning; night (moonlight) is unchanged.
 {hour:6+2/60,sky:0xc68e9d,sun:0xffac77,ambient:0xb5b3c8,power:1.75,fill:1.05,night:.52},
 {hour:7+10/60,sky:0x86b9e4,sun:0xffddb0,ambient:0xdde8d8,power:3.2,fill:1.55,night:0},
 {hour:10,sky:0x7eb9ea,sun:0xffead0,ambient:0xdff3ef,power:3.25,fill:1.65,night:0},
 {hour:16+40/60,sky:0x86b9e4,sun:0xffddb0,ambient:0xdde8d8,power:3.2,fill:1.55,night:0},
 {hour:17.8,sky:0xc68e9d,sun:0xffac77,ambient:0xb5b3c8,power:1.75,fill:1.05,night:.52},
 {hour:18+50/60,sky:0x172943,sun:0xb6d3ff,ambient:0xa0b9d2,power:.42,fill:.85,night:1},
 {hour:24,sky:0x172943,sun:0xb6d3ff,ambient:0xa0b9d2,power:.42,fill:.85,night:1}
];
/** Full night (between the last dusk and first dawn frames) runs this much faster, so it lasts a third less real time. */
const NIGHT_START=18+50/60,NIGHT_END=5,NIGHT_RATE=1.5;
export class TimeOfDaySystem{
 /** Clock seconds per 24 h; `elapsed` is measured in clock seconds. */
 readonly daySeconds=480;elapsed=0;
 /** Real seconds for one full day, with the faster night. */
 get cycleSeconds(){const night=(24-NIGHT_START+NIGHT_END)/24*this.daySeconds;return this.daySeconds-night+night/NIGHT_RATE;}hour=9;day=1;phase:DayPhase='Day';night=0;sunPower=2;ambientPower=1.6;
 sky=new T.Color();sun=new T.Color();ambient=new T.Color();
 /** Hour the clock is held at (settings time switch), or null when the day cycle runs. */
 locked:number|null=null;
 constructor(){this.update(0);}
 /** Hold the clock at an hour of the current day (or the next, so the day counter never runs backwards), or release it. */
 setLock(hour:number|null){
  this.locked=hour;
  if(hour!==null){const total=9+this.elapsed/this.daySeconds*24;let target=Math.floor(total/24)*24+hour;if(target<9)target+=24;this.elapsed=(target-9)/24*this.daySeconds;}
  this.update(0);
 }
 /** Advances the clock by `dt` real seconds, split at the night boundaries so large steps stay exact. */
 private advance(dt:number){
  for(let left=dt,guard=0;left>1e-9&&guard<16;guard++){
   const h=(9+this.elapsed/this.daySeconds*24)%24,night=h>=NIGHT_START||h<NIGHT_END,rate=night?NIGHT_RATE:1;
   const hours=night?(h<NIGHT_END?NIGHT_END-h:24-h+NIGHT_END):NIGHT_START-h,toBoundary=hours/24*this.daySeconds/rate;
   if(left<toBoundary){this.elapsed+=left*rate;return;}
   this.elapsed+=hours/24*this.daySeconds+1e-7;left-=toBoundary;
  }
 }
 update(dt:number){if(this.locked===null)this.advance(dt);const total=9+this.elapsed/this.daySeconds*24;this.hour=total%24;this.day=Math.floor(total/24)+1;
  this.phase=this.hour>=5&&this.hour<9?'Morning':this.hour>=9&&this.hour<16+40/60?'Day':this.hour>=16+40/60&&this.hour<18+50/60?'Sunset':'Night';
  const i=FRAMES.findIndex((f,index)=>index<FRAMES.length-1&&this.hour>=f.hour&&this.hour<FRAMES[index+1].hour),a=FRAMES[Math.max(0,i)],b=FRAMES[Math.max(0,i)+1];
  const ratio=(this.hour-a.hour)/(b.hour-a.hour),t=ratio*ratio*(3-2*ratio);
  this.sky.setHex(a.sky).lerp(new T.Color(b.sky),t);this.sun.setHex(a.sun).lerp(new T.Color(b.sun),t);this.ambient.setHex(a.ambient).lerp(new T.Color(b.ambient),t);
  this.night=T.MathUtils.lerp(a.night,b.night,t);this.sunPower=T.MathUtils.lerp(a.power,b.power,t);this.ambientPower=T.MathUtils.lerp(a.fill,b.fill,t);
 }
 get clock(){return `${String(Math.floor(this.hour)).padStart(2,'0')}:${String(Math.floor(this.hour%1*60)).padStart(2,'0')}`;}
 activity(stage:number){const nightActivity=[.14,.24,.42,.68,.92][stage]??.92;return 1-this.night*(1-nightActivity);}
 reset(){this.elapsed=0;if(this.locked!==null)this.setLock(this.locked);else this.update(0);}
}




