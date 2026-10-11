/** Pixel painter in the graphics settings: a small grid editor (16/32/64 px) with pencil, eraser, fill and picker,
 * a palette plus a free colour, undo, and PNG export (download or copy to the clipboard) so a drawing can be pasted
 * into chat. The drawing is saved on this device. */
const KEY='stack-city-pixel-v1',VIEW=512,SIZES=[16,32,64] as const;
const PALETTE=['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'];
type Tool='pen'|'eraser'|'fill'|'pick';
const TOOLS:[Tool,string][]=[['pen','✎ 画笔'],['eraser','⌫ 橡皮'],['fill','▣ 填充'],['pick','◉ 取色']];

export class PixelPainter{
 private size=32;private pixels:(string|null)[]=new Array(32*32).fill(null);private color='#000000';private tool:Tool='pen';
 private undo:(string|null)[][]=[];private grid=true;private canvas!:HTMLCanvasElement;private ctx!:CanvasRenderingContext2D;
 constructor(){
  try{const saved=JSON.parse(localStorage.getItem(KEY)??'null') as {size:number;pixels:(string|null)[]}|null;
   if(saved&&(SIZES as readonly number[]).includes(saved.size)&&Array.isArray(saved.pixels)&&saved.pixels.length===saved.size*saved.size){this.size=saved.size;this.pixels=saved.pixels.map(p=>typeof p==='string'&&/^#[0-9a-f]{6}$/i.test(p)?p:null);}}catch{}
  const open=document.createElement('button');open.id='pixel-settings';open.textContent='✎ 像素画板';document.querySelector('.pause-panel .gfx-settings')!.append(open);
  const panel=document.createElement('section');panel.id='pixel-panel';panel.hidden=true;panel.setAttribute('aria-label','像素画板');
  panel.innerHTML=`<header><b>像素画板</b><button id="pixel-close">完成</button></header>
   <div class="pixel-row" role="group" aria-label="工具">${TOOLS.map(([t,label])=>`<button data-tool="${t}" aria-pressed="false">${label}</button>`).join('')}</div>
   <canvas id="pixel-canvas" width="${VIEW}" height="${VIEW}" role="img" aria-label="像素画布"></canvas>
   <div class="pixel-palette" role="group" aria-label="调色板">${PALETTE.map(c=>`<button data-color="${c}" style="background:${c}" aria-label="颜色 ${c}" aria-pressed="false"></button>`).join('')}<input id="pixel-color" type="color" aria-label="自定义颜色"></div>
   <div class="pixel-row"><label>尺寸 <select id="pixel-size">${SIZES.map(s=>`<option value="${s}">${s}×${s}</option>`).join('')}</select></label><button id="pixel-grid" aria-pressed="true">▦ 网格</button><button id="pixel-undo">↶ 撤销</button><button id="pixel-clear">清空</button></div>
   <div class="pixel-row"><button id="pixel-download">⤓ 下载 PNG</button><button id="pixel-copy">⧉ 复制图片</button></div>
   <output id="pixel-status" role="status"></output>`;
  document.getElementById('pause-menu')!.append(panel);
  this.canvas=panel.querySelector('#pixel-canvas')!;this.ctx=this.canvas.getContext('2d')!;
  // Inline !important: the global `#app canvas{width:100%!important}` rule for the game canvas would stretch it.
  this.canvas.style.setProperty('width','min(100%, 360px)','important');this.canvas.style.setProperty('height','auto','important');
  const status=panel.querySelector('#pixel-status')!,colorInput=panel.querySelector('#pixel-color') as HTMLInputElement,sizeSelect=panel.querySelector('#pixel-size') as HTMLSelectElement;
  const syncUi=()=>{
   panel.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===this.tool)));
   panel.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===this.color)));
   colorInput.value=this.color;sizeSelect.value=String(this.size);panel.querySelector('#pixel-grid')!.setAttribute('aria-pressed',String(this.grid));
  };
  panel.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.onclick=()=>{this.tool=b.dataset.tool as Tool;syncUi();});
  panel.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(b=>b.onclick=()=>{this.color=b.dataset.color!;if(this.tool==='eraser'||this.tool==='pick')this.tool='pen';syncUi();});
  colorInput.oninput=()=>{this.color=colorInput.value;if(this.tool==='eraser'||this.tool==='pick')this.tool='pen';syncUi();};
  sizeSelect.onchange=()=>{this.snapshot();this.resize(Number(sizeSelect.value));this.commit();};
  panel.querySelector<HTMLButtonElement>('#pixel-grid')!.onclick=()=>{this.grid=!this.grid;syncUi();this.draw();};
  panel.querySelector<HTMLButtonElement>('#pixel-undo')!.onclick=()=>{const last=this.undo.pop();if(!last)return;if(last.length!==this.pixels.length)this.size=Math.round(Math.sqrt(last.length));this.pixels=last;syncUi();this.commit();};
  panel.querySelector<HTMLButtonElement>('#pixel-clear')!.onclick=()=>{this.snapshot();this.pixels.fill(null);this.commit();status.textContent='已清空，可撤销';};
  panel.querySelector<HTMLButtonElement>('#pixel-download')!.onclick=async()=>{const blob=await this.png();if(!blob){status.textContent='导出失败';return;}
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pixel-art.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent='已下载 pixel-art.png';};
  panel.querySelector<HTMLButtonElement>('#pixel-copy')!.onclick=async()=>{try{const blob=await this.png();if(!blob)throw new Error();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);status.textContent='已复制，可以粘贴到聊天';}catch{status.textContent='浏览器不支持复制图片，请用下载';}};
  // Drawing: one undo step per stroke; moves are joined with lines so fast strokes leave no gaps.
  let last:[number,number]|null=null;
  this.canvas.addEventListener('pointerdown',e=>{e.preventDefault();this.canvas.setPointerCapture(e.pointerId);const p=this.cell(e);if(!p)return;
   if(this.tool==='pick'){const c=this.pixels[p[1]*this.size+p[0]];if(c){this.color=c;this.tool='pen';syncUi();}return;}
   this.snapshot();if(this.tool==='fill'){this.fill(p[0],p[1]);this.commit();return;}last=p;this.plot(p[0],p[1]);this.draw();});
  this.canvas.addEventListener('pointermove',e=>{if(!last)return;const p=this.cell(e);if(!p)return;this.line(last,p);last=p;this.draw();});
  const end=()=>{if(last){last=null;this.commit();}};this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);
  const close=()=>{panel.hidden=true;document.body.classList.remove('pixel-editing');};
  open.onclick=()=>{panel.hidden=false;document.body.classList.add('pixel-editing');syncUi();this.draw();(panel.querySelector('#pixel-close') as HTMLButtonElement).focus();};
  panel.querySelector<HTMLButtonElement>('#pixel-close')!.onclick=()=>{close();open.focus();};
  new MutationObserver(()=>{if(document.getElementById('pause-menu')!.hidden)close();}).observe(document.getElementById('pause-menu')!,{attributes:true,attributeFilter:['hidden']});
  syncUi();this.draw();
 }
 private cell(e:PointerEvent):[number,number]|null{const r=this.canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*this.size),y=Math.floor((e.clientY-r.top)/r.height*this.size);return x>=0&&y>=0&&x<this.size&&y<this.size?[x,y]:null;}
 private plot(x:number,y:number){this.pixels[y*this.size+x]=this.tool==='eraser'?null:this.color;}
 private line([x0,y0]:[number,number],[x1,y1]:[number,number]){const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx+dy;
  for(;;){this.plot(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}}
 private fill(x:number,y:number){const n=this.size,target=this.pixels[y*n+x];if(target===this.color)return;const stack=[y*n+x];
  while(stack.length){const i=stack.pop()!;if(this.pixels[i]!==target)continue;this.pixels[i]=this.color;const px=i%n,py=(i-px)/n;
   if(px>0)stack.push(i-1);if(px<n-1)stack.push(i+1);if(py>0)stack.push(i-n);if(py<n-1)stack.push(i+n);}}
 /** Keeps the overlapping top-left part of the drawing. */
 private resize(size:number){const next=new Array(size*size).fill(null);for(let y=0;y<Math.min(size,this.size);y++)for(let x=0;x<Math.min(size,this.size);x++)next[y*size+x]=this.pixels[y*this.size+x];this.size=size;this.pixels=next;}
 private snapshot(){this.undo.push(this.pixels.slice());if(this.undo.length>60)this.undo.shift();}
 private commit(){this.draw();try{localStorage.setItem(KEY,JSON.stringify({size:this.size,pixels:this.pixels}));}catch{}}
 private draw(){const c=this.ctx,n=this.size,s=VIEW/n;
  // Checkerboard shows transparency.
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=this.pixels[y*n+x];c.fillStyle=p??((x+y)%2?'#d9d9d9':'#f2f2f2');c.fillRect(x*s,y*s,s,s);}
  if(this.grid){c.strokeStyle='rgba(0,0,0,.14)';c.lineWidth=1;c.beginPath();for(let i=1;i<n;i++){const v=Math.round(i*s)+.5;c.moveTo(v,0);c.lineTo(v,VIEW);c.moveTo(0,v);c.lineTo(VIEW,v);}c.stroke();}
 }
 /** Exports at 16 px per pixel (capped near 1024 px) with nearest-neighbour edges and a transparent background. */
 private png(){const n=this.size,scale=Math.max(1,Math.floor(1024/n)),out=document.createElement('canvas');out.width=out.height=n*scale;const c=out.getContext('2d')!;
  for(let i=0;i<this.pixels.length;i++){const p=this.pixels[i];if(!p)continue;c.fillStyle=p;c.fillRect(i%n*scale,Math.floor(i/n)*scale,scale,scale);}
  return new Promise<Blob|null>(resolve=>out.toBlob(resolve,'image/png'));}
}
