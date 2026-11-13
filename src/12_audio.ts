/* ================= audio ================= */
let actx=null,master=null;
function initAudio(){if(actx)return;try{actx=new(window.AudioContext||(window as any).webkitAudioContext)();master=actx.createGain();master.gain.value=.45;master.connect(actx.destination);loadSamples();}catch(e){actx=null;}}
function noise(dur,f,q,g,sw?){
  if(!actx||!S.sound)return;
  const n=Math.max(1,(actx.sampleRate*dur)|0),buf=actx.createBuffer(1,n,actx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=actx.createBufferSource();s.buffer=buf;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.setValueAtTime(f,actx.currentTime);bp.Q.value=q;
  if(sw)bp.frequency.exponentialRampToValueAtTime(Math.max(60,f*sw),actx.currentTime+dur);
  const gn=actx.createGain();gn.gain.value=g;s.connect(bp);bp.connect(gn);gn.connect(master);s.start();
}
function tone(f0,f1,dur,g,type,delay?){
  if(!actx||!S.sound)return;
  const t0=actx.currentTime+(delay||0);const o=actx.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
  const gn=actx.createGain();gn.gain.setValueAtTime(g,t0);gn.gain.exponentialRampToValueAtTime(.001,t0+dur);o.connect(gn);gn.connect(master);o.start(t0);o.stop(t0+dur+.02);
}
const samples:any={};
function mkBuf(dur,fn){const sr=actx.sampleRate,n=(sr*dur)|0,b=actx.createBuffer(1,n,sr);fn(b.getChannelData(0),n,sr);return b;}
function loadSamples(){
  samples.amb_wind=mkBuf(4,(d,n)=>{let l=0,l2=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;l+=(w-l)*.035;l2+=(l-l2)*.05;d[i]=l2*14*(.55+.45*Math.sin(i/n*TAU*3)+.15*Math.sin(i/n*TAU*7));}});
  const th=(dur,k)=>mkBuf(dur,(d,n)=>{let l=0,l2=0;for(let i=0;i<n;i++){const t=i/n,w=Math.random()*2-1;l+=(w-l)*k;l2+=(l-l2)*k*1.3;d[i]=l2*Math.pow(1-t,2.2)*(1+.6*Math.sin(t*40))*9;}});
  samples.thunder1=th(2.4,.03);samples.thunder2=th(1.6,.05);
  const hit=(dur,f,nz)=>mkBuf(dur,(d,n,sr)=>{let ph=0;for(let i=0;i<n;i++){const t=i/n,fr=f*(1-.55*t);ph+=TAU*fr/sr;d[i]=(Math.sin(ph)*.9+(Math.random()*2-1)*nz*(1-t))*Math.pow(1-t,3);}});
  samples.knock=hit(.16,210,.5);samples.knock2=hit(.22,140,.35);samples.door_slam2=hit(.45,80,.8);
}
function play(n,g,rate,off?){if(!actx||!S.sound||!samples[n])return false;const s=actx.createBufferSource();s.buffer=samples[n];s.playbackRate.value=rate||1;const gn=actx.createGain();gn.gain.value=g==null?.6:g;s.connect(gn);gn.connect(master);s.start(0,off||0);return true;}
let windSrc=null,windGain=null;
function windLoop(v){if(!actx||!samples.amb_wind||!S.sound){return;}
  if(!windSrc){windSrc=actx.createBufferSource();windSrc.buffer=samples.amb_wind;windSrc.loop=true;windGain=actx.createGain();windGain.gain.value=0;windSrc.connect(windGain);windGain.connect(master);windSrc.start();}
  windGain.gain.setTargetAtTime(v,actx.currentTime,.3);}
const sfx={
  shot(k){({ar:()=>noise(.1,1800,.8,.55,.3),pump:()=>noise(.3,800,.6,.9,.2),smg:()=>noise(.06,2400,.8,.4,.4),sniper:()=>{noise(.4,700,.6,.9,.2)},pistol:()=>noise(.09,1500,.8,.5,.3)})[k]();},
  foe(){noise(.08,1200,.8,.15,.4);},
  hit(){tone(900,600,.05,.12,'square');},head(){tone(1500,1100,.08,.16,'square');},
  build(){if(play('knock2',.7,.9+Math.random()*.2))return;tone(150,70,.1,.28,'triangle');noise(.05,500,1,.12);},
  chest(){[520,660,800,1040].forEach((f,i)=>tone(f,f*1.01,.18,.12,'sine',i*.07));},
  pickup(){tone(700,1000,.1,.14,'sine');},
  reload(){noise(.04,3000,2,.3);setTimeout(()=>noise(.05,2400,2,.3),380);},
  harvest(){if(play('knock',.55,.9+Math.random()*.3))return;noise(.06,1300,1.5,.4);tone(300,200,.05,.1,'square');},
  hurt(){tone(220,120,.12,.2,'sawtooth');},
  crash(){if(play('door_slam2',.8,.8+Math.random()*.3))return;noise(.2,400,.7,.4,.3);},
  edit(){tone(900,1200,.05,.1,'triangle');},
  heal(){tone(500,900,.25,.14,'sine');},
  boom(){noise(.6,300,.5,1,.2);tone(90,40,.4,.4,'sawtooth');play('thunder2',.6,1.3);}
};

