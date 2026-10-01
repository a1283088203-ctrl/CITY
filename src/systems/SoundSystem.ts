/** Original procedural game audio. No samples or third-party game recordings. */
export class SoundSystem{
 enabled=true;private context:AudioContext|null=null;private master:GainNode|null=null;private windGain:GainNode|null=null;
 private voices=0;private lastImpact=-1;private lastWarning=-100;private noise:AudioBuffer|null=null;
 constructor(){try{this.enabled=localStorage.getItem('stack-city-sound')!=='off';}catch{}}
 async unlock(){
  try{
   if(!this.context){
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.enabled?.32:0;this.master.connect(this.context.destination);
    this.noise=this.context.createBuffer(1,this.context.sampleRate,this.context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=this.context.createBufferSource();source.buffer=this.noise;source.loop=true;
    const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=430;
    this.windGain=this.context.createGain();this.windGain.gain.value=0;source.connect(filter).connect(this.windGain).connect(this.master);source.start();
   }
   if(this.context.state==='suspended')await this.context.resume();
  }catch{/* Audio restrictions must never block play. */}
 }
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('stack-city-sound',this.enabled?'on':'off');}catch{}
  if(this.context&&this.master)this.master.gain.setTargetAtTime(this.enabled?.32:0,this.context.currentTime,.025);if(this.enabled){void this.unlock();this.tick();}return this.enabled;
 }
 private tone(frequency:number,end:number,duration:number,volume:number,type:OscillatorType='sine',delay=0){
  const c=this.context;if(!c||!this.master||!this.enabled||c.state!=='running'||this.voices>=24)return;
  const t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(Math.max(25,end),t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain).connect(this.master);this.voices++;osc.onended=()=>{osc.disconnect();gain.disconnect();this.voices--;};osc.start(t);osc.stop(t+duration+.015);
 }
 private rustle(duration:number,volume:number,frequency:number){
  const c=this.context;if(!c||!this.master||!this.noise||!this.enabled||c.state!=='running'||this.voices>=24)return;
  const t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter).connect(gain).connect(this.master);this.voices++;source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices--;};source.start();source.stop(t+duration);
 }
 tick(){this.tone(580,400,.065,.09,'triangle');}
 drop(){this.tone(150,42,.25,.38);this.tone(80,33,.32,.24,'triangle');this.rustle(.085,.1,520);}
 impact(speed:number){const t=this.context?.currentTime??0;if(t-this.lastImpact<.13)return;this.lastImpact=t;this.tone(95,35,.22,Math.min(.32,.08+speed*.012));this.rustle(.09,.055,700);}
 merge(level:number){const root=400+level*28;[1,1.25,1.5].forEach((ratio,i)=>{this.tone(root*ratio*1.45,root*ratio,.13,.23,'sine',i*.085);this.tone(root*ratio*.5,root*ratio*.65,.09,.06,'triangle',i*.085);});}
 collapse(){this.rustle(.5,.2,1000);this.tone(130,30,.45,.28,'triangle');[0,.07,.15].forEach(delay=>this.tone(230,70,.12,.09,'square',delay));}
 upgrade(){[523,659,784,1047].forEach((note,i)=>this.tone(note,note,.25,.13,'triangle',i*.105));}
 invalid(){this.tone(180,120,.12,.12,'triangle');}
 restart(){this.tone(350,520,.15,.12);this.tone(520,700,.17,.12,'sine',.1);}
 warning(){const t=this.context?.currentTime??0;if(t-this.lastWarning<4)return;this.lastWarning=t;this.tone(440,440,.15,.12,'triangle');this.tone(440,440,.15,.1,'triangle',.22);}
 update(wind:number,warning:number){if(this.context&&this.windGain)this.windGain.gain.setTargetAtTime(Math.max(0,wind-.25)*.04,this.context.currentTime,.5);if(warning>2)this.warning();}
 get activeVoices(){return this.voices;}
 get status(){return this.context?.state??'locked';}
}
