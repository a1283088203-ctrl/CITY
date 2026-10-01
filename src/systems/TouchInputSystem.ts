type Point={x:number;y:number};
type Actions={drop:()=>void;move:(dx:number,dy:number)=>void;aim:(x:number,y:number)=>void};

/** Touch gestures stay separate from mouse/keyboard and never create preview bodies. */
export class TouchInputSystem{
 private active:{id:number;start:Point;last:Point;button:boolean;holding:boolean;swiped:boolean}|null=null;
 private fingers=new Set<number>();private timer=0;private blocked=false;private suppressClickUntil=0;
 constructor(canvas:HTMLCanvasElement,private button:HTMLElement,private actions:Actions){
  const showTouch=()=>{document.body.dataset.input='touch';button.innerHTML='放下 <kbd>长按微调</kbd>';document.querySelector('.controls')!.textContent='点画面选位置 · 单指转视角 · 双指缩放';};
  if(matchMedia('(pointer: coarse)').matches)showTouch();
  document.addEventListener('pointerdown',e=>{
   if(e.pointerType!=='touch')return;
   showTouch();this.fingers.add(e.pointerId);
   if(this.fingers.size>1){this.blocked=true;this.cancel();}
  },true);
  for(const element of [canvas,button]){
   element.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||this.blocked)return;
    const point={x:e.clientX,y:e.clientY};
    this.active={id:e.pointerId,start:point,last:point,button:element===button,holding:false,swiped:false};
    if(element===button){element.setPointerCapture(e.pointerId);e.preventDefault();this.suppressClickUntil=performance.now()+1500;}
    if(element===button)this.timer=window.setTimeout(()=>{if(this.active&&!this.active.swiped){this.active.holding=true;this.active.last={x:this.active.last.x,y:this.active.last.y};button.classList.add('placing');button.innerHTML='松开放下 <kbd>拖动微调</kbd>';}},300);
   });
  }
  document.addEventListener('pointermove',e=>{
   const a=this.active;if(e.pointerType!=='touch'||!a||a.id!==e.pointerId||this.blocked)return;
   const dx=e.clientX-a.last.x,dy=e.clientY-a.last.y;
   if(a.holding){this.actions.move(dx,dy);}
   else if(!a.button&&Math.hypot(e.clientX-a.start.x,e.clientY-a.start.y)>12){
    clearTimeout(this.timer);a.swiped=true;
    return;
   }
   a.last={x:e.clientX,y:e.clientY};
  });
  const finish=(e:PointerEvent,cancelled:boolean)=>{
   if(e.pointerType!=='touch')return;
   const a=this.active;
   if(a?.id===e.pointerId){
    if(!cancelled&&!this.blocked){
     if(a.holding||a.button)this.actions.drop();
     else if(!a.swiped)this.actions.aim(e.clientX,e.clientY);
    }
    this.suppressClickUntil=performance.now()+800;this.cancel();
   }
   this.fingers.delete(e.pointerId);if(!this.fingers.size)this.blocked=false;
  };
  document.addEventListener('pointerup',e=>finish(e,false));
  document.addEventListener('pointercancel',e=>finish(e,true));
  button.addEventListener('lostpointercapture',()=>this.cancel());
  button.addEventListener('click',e=>{if(performance.now()<this.suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  for(const element of [canvas,button])element.addEventListener('contextmenu',e=>{if(this.active||document.body.dataset.input==='touch')e.preventDefault();});
  window.addEventListener('blur',()=>this.reset());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
 }
 private cancel(){clearTimeout(this.timer);this.active=null;this.button.classList.remove('placing');if(document.body.dataset.input==='touch')this.button.innerHTML='放下 <kbd>长按微调</kbd>';}
 reset(){this.cancel();this.fingers.clear();this.blocked=false;}
}
