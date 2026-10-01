import {BUILDINGS,buildingData} from '../data/buildings';

import {ProgressionSystem} from './ProgressionSystem';
import type {WindSystem} from './WindSystem';
import type {TimeOfDaySystem} from './TimeOfDaySystem';
import type {ScoreSystem} from './ScoreSystem';
export class UIManager{
 private noticeTime=0;private previousScores:Record<string,number>|null=null;private scoreAnimations=new Map<string,Animation>();
 constructor(parent:HTMLElement){const ui=document.createElement('div');ui.id='ui';ui.innerHTML=`
 <aside class="stats pixel-panel"><div class="eyebrow">▥ CITY LEVEL <span id="stage-number">01 / 05</span></div></aside>
 <aside class="weather pixel-panel"><div class="clock"><b id="clock">09:00</b><span id="wind-state">CALM</span><span id="wind-direction"></span></div></aside><div class="weather-actions hud-actions"><button id="sound" aria-label="音效开关" aria-pressed="true">♪ 音效 开</button><button id="fullscreen" title="切换浏览器全屏">⛶ 全屏</button><button id="restart" aria-label="重新开始">↻ 重开</button></div>
 <div id="toast" role="status"></div><div id="warning" role="alert"></div>
 <section class="build-strip pixel-panel"><div class="eyebrow">EVOLUTION</div><div class="levels">${BUILDINGS.map(b=>`<div class="level" data-level="${b.level}" title="${b.name} · ${b.population.toLocaleString()} 人"><div class="tower-icon" style="height:${8+b.level*3}px;--building:#${b.color.toString(16)}"></div><small>${b.level}</small></div>`).join('')}</div></section>
 <footer class="pixel-panel score-footer"><div class="score-total"><div class="eyebrow">TOTAL SCORE / 总分</div><strong id="total-score">0</strong><span id="score-loss" aria-live="polite"></span></div><button id="rotate" title="Q / E 旋转">↻</button><button id="drop">放下 <kbd>SPACE</kbd></button></footer>
 <div class="controls">单击 / SPACE 放下 · Q/E 旋转<br>拖动环绕 · 滚轮缩放 · WASD 微调</div>
 <div id="game-over" hidden><div class="pixel-panel"><small>PLANNING SESSION CLOSED</small><h2>城市需要喘口气</h2><p>建筑持续超出安全高度，规划暂停。</p><button id="again">开始新的城市 ↗</button></div></div>`;parent.append(ui);}
 bind(drop:()=>void,rotate:()=>void,restart:()=>void){document.querySelector('#drop')!.addEventListener('click',drop);document.querySelector('#rotate')!.addEventListener('click',rotate);for(const id of ['restart','again'])document.getElementById(id)!.addEventListener('click',restart);document.getElementById('fullscreen')!.addEventListener('click',()=>{const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();action.catch(()=>this.notify('浏览器未允许全屏 · 仍可继续游玩'));});}
 queue(current:number,next:number){const d=buildingData(current);document.getElementById('drop')!.title=`放下 LV${current} ${d.label} · 下一个 LV${next} ${buildingData(next).label}`;}
 update(dt:number,progress:ProgressionSystem,merges:number){
 this.set('stage-number',`${String(progress.index+1).padStart(2,'0')} / 05`);document.querySelectorAll<HTMLElement>('[data-level]').forEach(e=>e.classList.toggle('unlocked',Number(e.dataset.level)<=progress.maxLevel));
 document.body.dataset.stage=String(progress.index);document.body.dataset.merges=String(merges);this.noticeTime-=dt;document.getElementById('toast')!.classList.toggle('visible',this.noticeTime>0);}
 wind(wind:WindSystem){const angle=(Math.atan2(wind.direction.z,wind.direction.x)+Math.PI*2)%(Math.PI*2),arrow=['→','↘','↓','↙','←','↖','↑','↗'][Math.round(angle/(Math.PI/4))%8];this.set('wind-state',wind.state.replace('_',' '));this.set('wind-direction',wind.state==='CALM'?'':arrow);document.getElementById('wind-state')!.classList.toggle('gust',wind.state==='STRONG_WIND');}
 time(time:TimeOfDaySystem){this.set('clock',time.clock);document.body.dataset.night=String(time.night>.5);}
 score(score:ScoreSystem){
  const values:Record<string,number>={'total-score':score.total};
  for(const [id,value] of Object.entries(values)){
   this.set(id,`${id==='total-score'?'':'+'}${value.toLocaleString()}`);
   const previous=this.previousScores?.[id];if(previous===undefined||value===previous)continue;
   this.scoreAnimations.get(id)?.cancel();
   if(value<previous){
    const element=document.getElementById(id)!,base=getComputedStyle(element).color;
    const animation=element.animate([{color:'#ff736d',offset:0},{color:'#ff736d',offset:.25},{color:base,offset:.4},{color:'#ff736d',offset:.55},{color:'#ff736d',offset:.72},{color:base,offset:1}],{duration:900});
    this.scoreAnimations.set(id,animation);animation.onfinish=()=>this.scoreAnimations.delete(id);
    if(id==='total-score'){
     const loss=document.getElementById('score-loss')!;this.scoreAnimations.get('score-loss')?.cancel();loss.textContent=`−${(previous-value).toLocaleString()}`;
     const floating=loss.animate([{opacity:1,transform:'translateY(0)'},{opacity:1,transform:'translateY(-6px)',offset:.65},{opacity:0,transform:'translateY(-12px)'}],{duration:1100});this.scoreAnimations.set('score-loss',floating);floating.onfinish=()=>{loss.textContent='';this.scoreAnimations.delete('score-loss');};
    }
   }
  }
  this.previousScores=values;
 }
 resetScore(){this.previousScores=null;for(const animation of this.scoreAnimations.values())animation.cancel();this.scoreAnimations.clear();this.set('score-loss','');}
 notify(message:string){this.set('toast',message);this.noticeTime=3.5;}
 warning(seconds:number){this.set('warning',seconds>1?`STRUCTURAL INSTABILITY · ${Math.max(0,10-seconds).toFixed(1)}s`:'');}
 end(value:boolean){(document.getElementById('game-over') as HTMLElement).hidden=!value;}
 private set(id:string,value:string){const e=document.getElementById(id)!;if(e.textContent!==value)e.textContent=value;}
}





