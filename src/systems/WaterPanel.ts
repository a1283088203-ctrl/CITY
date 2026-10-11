import {defaultWater,setWaterStyle,type WaterStyle} from './WaterReflection';
const KEY='stack-city-water-v1';
type Field=[Exclude<keyof WaterStyle,'color'>,string,number,number,number];
const FIELDS:Field[]=[['reflection','倒影强度',0,1,.01],['opacity','水面不透明度',.5,1,.01],['glint','波光强度',0,1.5,.01]];
/** Water palette in the graphics settings. While it is open the pause menu goes transparent, so changes show on the
 * live river; a day-phase switch sits on top to check the water at dawn, day, dusk and night. Saved on this device. */
export class WaterPanel{
 readonly timeSlot:HTMLElement;
 constructor(){
  let value=defaultWater();
  try{const saved=JSON.parse(localStorage.getItem(KEY)??'null') as WaterStyle|null;
   if(saved&&/^#[0-9a-f]{6}$/i.test(saved.color)&&FIELDS.every(([k,,min,max])=>Number.isFinite(saved[k])&&saved[k]>=min&&saved[k]<=max))value=saved;}catch{}
  const open=document.createElement('button');open.id='water-settings';open.textContent='≈ 水面色盘';document.querySelector('.pause-panel .gfx-settings')!.append(open);
  const panel=document.createElement('section');panel.id='water-panel';panel.hidden=true;
  panel.innerHTML=`<header><b>水面色盘</b><button id="water-close">完成</button></header><small>实时预览游戏画面 · 参数保存在本机</small><div id="water-time"></div><label>水的颜色 <input id="water-color" type="color"></label>${FIELDS.map(([k,label,min,max,step])=>`<label>${label} <input id="water-${k}" type="range" min="${min}" max="${max}" step="${step}"><b id="water-${k}-value"></b></label>`).join('')}<div id="water-swatch"></div><div><button id="water-reset">恢复默认</button><button id="water-copy">复制参数</button></div><textarea id="water-json" readonly aria-label="水面参数"></textarea><output id="water-status" role="status"></output>`;
  document.getElementById('pause-menu')!.append(panel);this.timeSlot=panel.querySelector('#water-time')!;
  const color=panel.querySelector('#water-color') as HTMLInputElement,json=panel.querySelector('textarea')!,status=panel.querySelector('#water-status')!;
  const sync=()=>{color.value=value.color;for(const [k] of FIELDS){(panel.querySelector(`#water-${k}`) as HTMLInputElement).value=String(value[k]);panel.querySelector(`#water-${k}-value`)!.textContent=`${Math.round(value[k]*100)}%`;}
   (panel.querySelector('#water-swatch') as HTMLElement).style.background=value.color;json.value=JSON.stringify(value,null,2);setWaterStyle(value);try{localStorage.setItem(KEY,JSON.stringify(value));}catch{}};
  color.oninput=()=>{value.color=color.value;sync();};
  for(const [k] of FIELDS){const range=panel.querySelector(`#water-${k}`) as HTMLInputElement;range.oninput=()=>{value[k]=Number(range.value);sync();};}
  const close=()=>{panel.hidden=true;document.body.classList.remove('water-editing');};
  open.onclick=()=>{panel.hidden=false;document.body.classList.add('water-editing');document.getElementById('water-close')!.focus();};
  document.getElementById('water-close')!.onclick=()=>{close();open.focus();};
  document.getElementById('water-reset')!.onclick=()=>{value=defaultWater();sync();status.textContent='已恢复默认';};
  document.getElementById('water-copy')!.onclick=async()=>{try{await navigator.clipboard.writeText(json.value);status.textContent='已复制，可以粘贴到聊天';}catch{json.focus();json.select();status.textContent='请全选复制参数';}};
  new MutationObserver(()=>{if(document.getElementById('pause-menu')!.hidden)close();}).observe(document.getElementById('pause-menu')!,{attributes:true,attributeFilter:['hidden']});
  sync();
 }
}
