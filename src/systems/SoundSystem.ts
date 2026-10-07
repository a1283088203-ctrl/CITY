/** Original procedural game audio in a cosy, bubbly style: every sound is built from soft "bloop" pops
 * (a sine whose pitch sweeps quickly upward, like a bubble). Synthesised with Web Audio; no samples. */
// C major pentatonic: any run of these notes sounds friendly together.
const PENTA=[0,2,4,7,9];
/** Pentatonic step above C4 (step 5 = C5, step 10 = C6). */
const scale=(step:number)=>{const octave=Math.floor(step/5),i=((step%5)+5)%5;return 261.63*Math.pow(2,(octave*12+PENTA[i])/12);};

export class SoundSystem{
 enabled=true;private context:AudioContext|null=null;private master:GainNode|null=null;private bus:GainNode|null=null;private windGain:GainNode|null=null;
 private voices=0;private lastImpact=-1;private lastWarning=-100;private lastTick=-1;private noise:AudioBuffer|null=null;
 constructor(){try{this.enabled=localStorage.getItem('stack-city-sound')!=='off';}catch{}}
 async unlock(){
  try{
   if(!this.context){
    const c=this.context=new AudioContext();
    this.master=c.createGain();this.master.gain.value=this.enabled?.32:0;this.master.connect(c.destination);
    // Pops stay mostly dry; a faint short echo just rounds them off.
    this.bus=c.createGain();const warm=c.createBiquadFilter();warm.type='lowpass';warm.frequency.value=6000;
    const delay=c.createDelay(1),feedback=c.createGain(),damp=c.createBiquadFilter(),wet=c.createGain();
    delay.delayTime.value=.09;feedback.gain.value=.15;damp.type='lowpass';damp.frequency.value=2500;wet.gain.value=.1;
    this.bus.connect(warm).connect(this.master);warm.connect(delay).connect(damp).connect(feedback).connect(delay);damp.connect(wet).connect(this.master);
    this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    // Wind bed bypasses the echo.
    const source=c.createBufferSource();source.buffer=this.noise;source.loop=true;
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;
    this.windGain=c.createGain();this.windGain.gain.value=0;source.connect(filter).connect(this.windGain).connect(this.master);source.start();
   }
   if(this.context.state==='suspended')await this.context.resume();
  }catch{/* Audio restrictions must never block play. */}
 }
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('stack-city-sound',this.enabled?'on':'off');}catch{}
  if(this.context&&this.master)this.master.gain.setTargetAtTime(this.enabled?.32:0,this.context.currentTime,.025);if(this.enabled){void this.unlock();this.tick();}return this.enabled;
 }
 private ready(){const c=this.context;return c&&this.bus&&this.enabled&&c.state==='running'&&this.voices<32?c:null;}
 /** The core "bloop": pitch sweeps from below the note up past it in a few tens of ms while the level pops and decays.
  * `rise` < 1 makes a falling "bwop" instead. A quiet octave adds a rounder, bubblier body. */
 private pop(frequency:number,delay=0,volume=.2,length=.11,rise=1.6){
  const c=this.ready();if(!c)return;const t=c.currentTime+delay,f=frequency*(1+(Math.random()-.5)*.02);
  const start=f/Math.sqrt(rise),end=f*Math.sqrt(rise),sweep=Math.min(.05,length*.45);
  for(const [mult,level] of [[1,1],[2,.18]] as const){
   const o=c.createOscillator(),g=c.createGain();o.type='sine';
   o.frequency.setValueAtTime(start*mult,t);o.frequency.exponentialRampToValueAtTime(end*mult,t+sweep);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume*level,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+length);
   o.connect(g).connect(this.bus!);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};o.start(t);o.stop(t+length+.02);
  }
 }
 /** A soft, low thump for weight under a pop (falling sine). */
 private thump(frequency:number,volume:number,length=.18,delay=0){
  const c=this.ready();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type='sine';
  o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.45),t+length);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+length);
  o.connect(g).connect(this.bus!);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};o.start(t);o.stop(t+length+.02);
 }
 /** Short filtered noise, used sparingly for a little fizz or crumble. */
 private fizz(duration:number,volume:number,frequency:number,type:BiquadFilterType='bandpass',delay=0,sweepTo?:number){
  const c=this.ready();if(!c||!this.noise)return;const t=c.currentTime+delay;
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type=type;f.Q.value=1;
  f.frequency.setValueAtTime(frequency,t);if(sweepTo)f.frequency.exponentialRampToValueAtTime(sweepTo,t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  s.connect(f).connect(g).connect(this.bus!);this.voices++;s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();this.voices--;};
  s.start(t,Math.random()*Math.max(0,.95-duration));s.stop(t+duration+.01);
 }
 /** Rotate: one tiny high bloop. */
 tick(){const t=this.context?.currentTime??0;if(t-this.lastTick<.04)return;this.lastTick=t;this.pop(scale(9),0,.12,.07,1.8);}
 /** Place: a round mid "bo" over a soft thump, loud enough for phone speakers. */
 drop(){this.pop(scale(3),0,.32,.14,1.7);this.thump(170,.32,.16);}
 impact(speed:number){const t=this.context?.currentTime??0;if(t-this.lastImpact<.13)return;this.lastImpact=t;const v=Math.min(.3,.08+speed*.013);this.pop(scale(1),0,v,.1,1.4);this.thump(130,v*.8,.14);}
 /** Merge: the placement "bo" at the same low pitch over a deeper, heavier thump, a bit louder. */
 merge(_level:number){this.pop(scale(3),0,.4,.16,1.7);this.thump(150,.42,.2);}
 /** Collapse: tumbling pops falling down the scale over a soft crumble and thud. */
 collapse(){this.fizz(.45,.16,1200,'lowpass',0,240);this.thump(150,.3,.4);[6,4,3,1,0].forEach((s,i)=>this.pop(scale(s),.04+i*.07,.17,.11,.6));}
 /** City stage unlocked: a quick bubbly run up the scale, ending on a held high pop. */
 upgrade(){[5,6,7,8,9].forEach((s,i)=>this.pop(scale(s),i*.07,.2,.12,1.7));this.pop(scale(10),.38,.22,.3,2.2);this.fizz(.2,.03,7000,'highpass',.38);}
 /** Can't build here: two falling "bwop"s. */
 invalid(){this.pop(scale(2),0,.2,.12,.55);this.pop(scale(0),.1,.2,.15,.55);}
 restart(){[5,7,10].forEach((s,i)=>this.pop(scale(s),i*.09,.2,.13,1.7));}
 /** Height warning: two medium pops, at most every 4 seconds. */
 warning(){const t=this.context?.currentTime??0;if(t-this.lastWarning<4)return;this.lastWarning=t;this.pop(scale(7),0,.2,.14,1.5);this.pop(scale(7),.2,.18,.14,1.5);}
 update(wind:number,warning:number){if(this.context&&this.windGain)this.windGain.gain.setTargetAtTime(Math.max(0,wind-.25)*.04,this.context.currentTime,.5);if(warning>2)this.warning();}
 get activeVoices(){return this.voices;}
 get status(){return this.context?.state??'locked';}
}
