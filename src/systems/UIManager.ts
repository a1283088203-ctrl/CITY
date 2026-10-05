import {BUILDINGS,buildingData} from '../data/buildings';

import {ProgressionSystem} from './ProgressionSystem';
import type {WindSystem} from './WindSystem';
import type {TimeOfDaySystem} from './TimeOfDaySystem';
import type {ScoreSystem} from './ScoreSystem';
export class UIManager{
 private noticeTime=0;private previousScores:Record<string,number>|null=null;private scoreAnimations=new Map<string,Animation>();
 constructor(parent:HTMLElement){const ui=document.createElement('div');ui.id='ui';ui.innerHTML=`
 <aside class="stats pixel-panel"><div class="eyebrow">▥ CITY LEVEL <span id="stage-number">01 / 05</span></div></aside>
 <aside class="weather pixel-panel"><div class="clock"><b id="clock">09:00</b><span id="wind-state">CALM</span><span id="wind-direction"></span></div></aside><button id="pause" class="pause-toggle pixel-panel" aria-label="暂停菜单" aria-expanded="false">Ⅱ</button><div id="pause-menu" hidden role="dialog" aria-modal="true" aria-label="暂停菜单"><div class="pixel-panel pause-panel"><h2>已暂停</h2><button id="resume">▶ 继续游戏</button><div class="weather-actions"><button id="sound" aria-label="音效开关" aria-pressed="true">♪ 音效 开</button><button id="fullscreen" title="切换浏览器全屏">⛶ 全屏</button><button id="restart" aria-label="重新开始">↻ 重开</button></div><details class="controls-help"><summary>操作</summary><div class="controls">单击 / SPACE 放下 · Q/E 旋转<br>拖动环绕 · 滚轮缩放 · WASD 微调</div></details></div></div>
 <div id="toast" role="status"></div><div id="warning" role="alert"></div>
 <section class="build-strip pixel-panel"><div class="eyebrow">EVOLUTION</div><div class="levels">${BUILDINGS.map(b=>`<div class="level" data-level="${b.level}" title="${b.name} · ${b.population.toLocaleString()} 人"><div class="tower-icon" style="height:${8+b.level*3}px;--building:#${b.color.toString(16)}"></div><small>${b.level}</small></div>`).join('')}</div></section>
 <footer class="pixel-panel score-footer"><div class="score-total"><div class="eyebrow">TOTAL SCORE / 总分</div><strong id="total-score">0</strong><span id="score-loss" aria-live="polite"></span></div><button id="missile" title="导弹拆除 · 冷却 60 秒" aria-label="选择导弹拆除" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4v3h2v10h3v5h-5v2h-4v-2H5v-5h3V5h2z" fill="currentColor"/><path d="M10 8h4v4h-4z" fill="#365c48"/></svg><span id="missile-label">导弹</span></button><button id="rotate" title="旋转建筑 90° · Q / E" aria-label="旋转建筑 90 度"><span aria-hidden="true">↻</span><span class="rotate-label">旋转</span></button><button id="drop">放下 <kbd>SPACE</kbd></button></footer>
 
 <div id="game-over" hidden><div class="pixel-panel"><small>PLANNING SESSION CLOSED</small><h2>城市需要喘口气</h2><p>建筑持续超出安全高度，规划暂停。</p><button id="again">开始新的城市 ↗</button></div></div>`;parent.append(ui);}
 bind(drop:()=>void,rotate:()=>void,restart:()=>void){document.querySelector('#drop')!.addEventListener('click',drop);const rotateButton=document.getElementById('rotate')!;let touchStart:{id:number;x:number;y:number}|null=null,lastTouch=-Infinity;
 rotateButton.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.isPrimary){touchStart={id:e.pointerId,x:e.clientX,y:e.clientY};rotateButton.setPointerCapture(e.pointerId);e.preventDefault();}});
 rotateButton.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;lastTouch=performance.now();if(touchStart?.id===e.pointerId&&Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)<12)rotate();touchStart=null;e.preventDefault();});
 rotateButton.addEventListener('pointercancel',()=>touchStart=null);
 rotateButton.addEventListener('click',e=>{if(e.detail===0||performance.now()-lastTouch>800)rotate();});for(const id of ['restart','again'])document.getElementById(id)!.addEventListener('click',restart);document.getElementById('fullscreen')!.addEventListener('click',()=>{const action=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();if(!action){this.notify('此浏览器不支持全屏');return;}action.catch(()=>this.notify('浏览器未允许全屏 · 仍可继续游玩'));});}
 bindTools(pause:()=>void,resume:()=>void,missile:()=>void){
  document.getElementById('pause')!.addEventListener('click',pause);
  document.getElementById('resume')!.addEventListener('click',resume);
  document.getElementById('missile')!.addEventListener('click',missile);
 }
 pause(value:boolean){const panel=document.getElementById('pause-menu')!;panel.hidden=!value;document.getElementById('pause')!.setAttribute('aria-expanded',String(value));document.body.classList.toggle('paused',value);if(value)document.getElementById('resume')!.focus();else{const canvas=document.querySelector('canvas');if(canvas){canvas.tabIndex=-1;canvas.focus({preventScroll:true});}}}
 tool(active:boolean,cooldown:number){const button=document.getElementById('missile') as HTMLButtonElement;button.disabled=cooldown>0;button.setAttribute('aria-pressed',String(active));this.set('missile-label',cooldown>0?`${Math.ceil(cooldown)}s`:active?'取消':'导弹');document.body.dataset.tool=active?'missile':'building';(document.getElementById('rotate') as HTMLButtonElement).disabled=active;}
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
    const animation=element.animate([{color:'#f4ebd0',offset:0},{color:'#f4ebd0',offset:.25},{color:base,offset:.4},{color:'#f4ebd0',offset:.55},{color:'#f4ebd0',offset:.72},{color:base,offset:1}],{duration:900});
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





