import {defaultGrade,type Grade} from '../scenes/ColorGradePass';
import {approvedGrade} from '../data/colorGrade';
const KEY='city-grading-draft-v2';
type Field=[keyof Grade,string,number,number,number];
const GROUPS:[string,Field[]][]=[
 ['曝光 / 影调',[['exposure','曝光 EV',-3,3,.05],['brightness','亮度',-.3,.3,.01],['contrast','对比度',.4,2,.01],['gamma','中间调 Gamma',.4,2.5,.01],['shadows','阴影',-1,1,.01],['highlights','高光',-1,1,.01]]],
 ['白平衡 / 色彩',[['temperature','色温（冷 → 暖）',-1,1,.01],['tint','色调（绿 → 洋红）',-1,1,.01],['saturation','饱和度',0,2,.01],['vibrance','自然饱和度',-1,1,.01]]],
 ['分离色调',[['shadowHue','暗部色相',0,360,1],['shadowAmount','暗部强度',0,1,.01],['highlightHue','亮部色相',0,360,1],['highlightAmount','亮部强度',0,1,.01]]],
 ['效果',[['vignette','暗角',0,1,.01]]]
];
const FIELDS=GROUPS.flatMap(([,f])=>f);
/** Grading lab in the pause menu. The menu goes transparent while it is open, so every change shows on the live scene;
 * a day-phase switch sits on top so the grade can be checked at dawn, day, dusk and night. */
export class ColorPanel{
 private value=approvedGrade();private panel:HTMLElement;private channel:keyof Grade['curves']='master';private band=0;private bypass=false;
 readonly timeSlot:HTMLElement;
 constructor(private apply:(g:Grade)=>void){
  const button=document.createElement('button');button.id='color-settings';button.textContent='◐ 调色实验室';document.querySelector('.pause-panel .gfx-settings')!.append(button);
  this.panel=document.createElement('section');this.panel.id='color-panel';this.panel.hidden=true;this.panel.innerHTML=`<header><b>调色实验室</b><button id="color-close">完成</button></header><small>实时预览游戏画面 · 参数保存在本机</small><details open><summary>时段</summary><div id="grade-time"></div></details>${GROUPS.map(([title],i)=>`<details${i<2?' open':''}><summary>${title}</summary><div id="grade-group-${i}"></div>${i===2?'<div class="split-swatch"><i id="grade-shadow-swatch"></i><i id="grade-highlight-swatch"></i></div>':''}</details>`).join('')}<details><summary>HSL 分色调整</summary><select id="grade-band" aria-label="HSL 色段">${['红','黄','绿','青','蓝','紫'].map((v,i)=>`<option value="${i}">${v}</option>`).join('')}</select><div id="grade-hsl"></div></details><details><summary>色调曲线</summary><select id="grade-channel" aria-label="曲线通道">${[['master','总曲线'],['red','红通道'],['green','绿通道'],['blue','蓝通道']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select><svg id="grade-curve" viewBox="0 0 256 144" aria-label="拖动曲线控制点调整输出亮度"><path d="M8 136L248 8 M8 72H248 M128 8V136" stroke="#6d8c7b" fill="none"/><polyline fill="none" stroke="#ffe3a0" stroke-width="2"/>${[0,1,2,3,4].map(i=>`<circle data-point="${i}" r="5" fill="#ffe3a0"/>`).join('')}</svg><div id="grade-points"></div><small>输入位置固定，调节输出；分段线性插值。</small></details><div class="grade-actions"><button id="grade-compare" aria-pressed="false">对比原图</button><button id="grade-reset">恢复默认</button><button id="grade-neutral">清空调色</button><button id="grade-copy">复制参数</button><button id="grade-paste">粘贴参数</button></div><textarea id="grade-json" aria-label="调色参数 JSON"></textarea><output id="grade-status" role="status"></output>`;
  document.getElementById('pause-menu')!.append(this.panel);this.timeSlot=document.getElementById('grade-time')!;
  GROUPS.forEach(([,fields],i)=>{for(const [key,label,min,max,step] of fields)this.slider(`grade-group-${i}`,key,label,min,max,step,()=>this.value[key] as number,v=>{(this.value[key] as number)=v;});});
  for(const [i,label,min,max,step] of [[0,'色相',-45,45,1],[1,'饱和度',-1,1,.01],[2,'明度',-1,1,.01]] as [number,string,number,number,number][])this.slider('grade-hsl',`hsl-${i}`,label,min,max,step,()=>this.value.hsl[this.band][i],v=>{this.value.hsl[this.band][i]=v;});
  for(let i=0;i<5;i++)this.slider('grade-points',`point-${i}`,['黑场','暗部','中间调','亮部','白场'][i],0,1,.01,()=>this.value.curves[this.channel][i],v=>{this.value.curves[this.channel][i]=v;});
  const close=()=>{this.panel.hidden=true;document.body.classList.remove('color-editing');this.bypass=false;this.changed();};
  button.onclick=()=>{this.panel.hidden=false;document.body.classList.add('color-editing');this.sync();document.getElementById('color-close')!.focus();};
  document.getElementById('color-close')!.onclick=()=>{close();button.focus();};
  document.getElementById('grade-band')!.onchange=e=>{this.band=Number((e.target as HTMLSelectElement).value);this.sync();};
  document.getElementById('grade-channel')!.onchange=e=>{this.channel=(e.target as HTMLSelectElement).value as typeof this.channel;this.sync();};
  document.getElementById('grade-compare')!.onclick=()=>{this.bypass=!this.bypass;this.changed();};
  document.getElementById('grade-reset')!.onclick=()=>{this.value=approvedGrade();this.bypass=false;this.changed();this.status('已恢复默认调色');};
  document.getElementById('grade-neutral')!.onclick=()=>{this.value=defaultGrade();this.bypass=false;this.changed();this.status('已清空，所有参数归零');};
  const area=document.getElementById('grade-json') as HTMLTextAreaElement;
  document.getElementById('grade-copy')!.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);this.status('参数已复制，粘贴到聊天即可');}catch{area.focus();area.select();this.status('请长按或全选复制下方参数');}};
  document.getElementById('grade-paste')!.onclick=async()=>{let text=area.value;try{text=await navigator.clipboard.readText();}catch{}const grade=this.parse(text);if(grade){this.value=grade;this.changed();this.status('已应用粘贴的参数');}else this.status('参数格式不正确，可直接编辑下方文本后再点粘贴');};
  const svg=this.panel.querySelector('svg')!;let point=-1;
  const move=(e:PointerEvent)=>{if(point<0)return;const r=svg.getBoundingClientRect(),y=(e.clientY-r.top)/r.height*144;this.value.curves[this.channel][point]=Math.round(Math.max(0,Math.min(1,(136-y)/128))*100)/100;this.changed();};
  svg.onpointerdown=e=>{const target=e.target as Element;if(!target.hasAttribute('data-point'))return;point=Number(target.getAttribute('data-point'));svg.setPointerCapture(e.pointerId);e.preventDefault();move(e);};svg.onpointermove=move;svg.onpointerup=svg.onpointercancel=()=>{point=-1;};
  new MutationObserver(()=>{if((document.getElementById('pause-menu') as HTMLElement).hidden&&!this.panel.hidden)close();}).observe(document.getElementById('pause-menu')!,{attributes:true,attributeFilter:['hidden']});
  try{const saved=this.parse(localStorage.getItem(KEY)??'');if(saved)this.value=saved;}catch{/* A missing or damaged local draft leaves the approved settings intact. */}
  this.changed();
 }
 /** Validates a grade from JSON; missing newer fields fall back to neutral so older copied presets still load. */
 private parse(text:string):Grade|null{
  let raw:Partial<Grade>;try{raw=JSON.parse(text);}catch{return null;}
  if(!raw||typeof raw!=='object')return null;const grade={...defaultGrade(),...raw} as Grade;
  const ok=FIELDS.every(([key,,min,max])=>{const v=grade[key];return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;})
   &&Array.isArray(grade.hsl)&&grade.hsl.length===6&&grade.hsl.every(v=>Array.isArray(v)&&v.length===3&&v.every((n,i)=>Number.isFinite(n)&&Math.abs(n)<=(i===0?45:1)))
   &&!!grade.curves&&(['master','red','green','blue'] as const).every(k=>{const points=grade.curves[k];return Array.isArray(points)&&points.length===5&&points.every(n=>Number.isFinite(n)&&n>=0&&n<=1);});
  return ok?grade:null;
 }
 private status(text:string){document.getElementById('grade-status')!.textContent=text;}
 private bindings:(()=>void)[]=[];
 private slider(parent:string,id:string,label:string,min:number,max:number,step:number,get:()=>number,set:(v:number)=>void){
  const row=document.createElement('label');row.className='grade-row';row.innerHTML=`<span>${label}</span><input id="grade-${id}" type="range" min="${min}" max="${max}" step="${step}"><input type="number" aria-label="${label}数值" min="${min}" max="${max}" step="${step}">`;document.getElementById(parent)!.append(row);const [range,number]=Array.from(row.querySelectorAll('input'));
  const update=(v:string)=>{if(v.trim()===''||!Number.isFinite(Number(v)))return;set(Math.max(min,Math.min(max,Number(v))));this.changed();};range.oninput=()=>update(range.value);number.onchange=()=>update(number.value);this.bindings.push(()=>{range.value=number.value=String(get());});
 }
 private changed(){try{localStorage.setItem(KEY,JSON.stringify(this.value));}catch{}this.apply(this.bypass?defaultGrade():this.value);this.sync();}
 private sync(){this.bindings.forEach(f=>f());const points=this.value.curves[this.channel].map((v,i)=>`${8+i*60},${136-v*128}`);this.panel.querySelector('polyline')!.setAttribute('points',points.join(' '));this.panel.querySelectorAll('circle').forEach((c,i)=>{const [x,y]=points[i].split(',');c.setAttribute('cx',x);c.setAttribute('cy',y);});
  (document.getElementById('grade-shadow-swatch') as HTMLElement).style.background=`hsl(${this.value.shadowHue} 70% 45%)`;(document.getElementById('grade-highlight-swatch') as HTMLElement).style.background=`hsl(${this.value.highlightHue} 85% 65%)`;
  const area=document.getElementById('grade-json') as HTMLTextAreaElement;if(document.activeElement!==area)area.value=JSON.stringify(this.value,null,2);const compare=document.getElementById('grade-compare')!;compare.textContent=this.bypass?'正在看原图 · 返回调色':'对比原图';compare.setAttribute('aria-pressed',String(this.bypass));}
}
