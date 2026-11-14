/* ============ 音（太鼓と笛をコードで合成） ============ */
const Aud=(()=>{
 let ac=null,master=null,noiseBuf=null,muted=false,scene=null,timer=null,step=0,nextT=0,bar=0,phrase=[],duck=false;
 try{muted=localStorage.getItem("sumo-mute")==="1"}catch(e){}
 // 民謡音階（D F G A C）を3オクターブ
 const SC=[293.66,349.23,392,440,523.25];
 const note=(i)=>SC[((i%5)+5)%5]*Math.pow(2,Math.floor(i/5));
 function init(){
  if(ac){if(ac.state==="suspended")ac.resume();return}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  ac=new C();master=ac.createGain();master.gain.value=muted?0:0.8;
  const cp=ac.createDynamicsCompressor();master.connect(cp);cp.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  if(scene)startBgm();
 }
 const env=(g,t,a,pk,dec,end)=>{g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)};
 function noise(t,dur,type,f,q,vol){const s=ac.createBufferSource();s.buffer=noiseBuf;const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;const g=ac.createGain();env(g,t,0.004,vol,dur);s.connect(b);b.connect(g);g.connect(master);s.start(t);s.stop(t+dur+0.05)}
 // 太鼓：低い「ドン」
 function don(t,v=1,deep=1){const o=ac.createOscillator(),g=ac.createGain();o.type="sine";const f0=deep>1?150:120,f1=deep>1?48:62;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+0.28);env(g,t,0.004,0.9*v,0.42*deep);o.connect(g);g.connect(master);o.start(t);o.stop(t+0.6*deep);noise(t,0.08,"lowpass",900,0.7,0.45*v)}
 // 縁を打つ「カッ」
 function ka(t,v=1){noise(t,0.07,"bandpass",2200,1.4,0.5*v);const o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(170,t+0.07);env(g,t,0.003,0.3*v,0.09);o.connect(g);g.connect(master);o.start(t);o.stop(t+0.15)}
 // 拍子木
 function clack(t,v=1){[0,0.09].forEach((dt,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type="square";o.frequency.value=i?1250:1050;const f=ac.createBiquadFilter();f.type="bandpass";f.frequency.value=1500;env(g,t+dt,0.001,0.25*v,0.05);o.connect(f);f.connect(g);g.connect(master);o.start(t+dt);o.stop(t+dt+0.1)})}
 // 笛（篠笛ふう）：息の音＋ゆれ
 function fue(t,f,dur,v=1,gl=0){
  const o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),lf=ac.createOscillator(),lg=ac.createGain();
  o.type="sine";o2.type="sine";o.frequency.setValueAtTime(gl?f*gl:f,t);if(gl)o.frequency.exponentialRampToValueAtTime(f,t+0.12);o2.frequency.value=f*2;
  lf.frequency.value=5.2;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*0.012,t+Math.min(0.4,dur));lf.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
  const g2=ac.createGain();g2.gain.value=0.18;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5*v,t+0.07);g.gain.setValueAtTime(0.42*v,t+Math.max(0.08,dur-0.12));g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.08);
  o.connect(g);o2.connect(g2);g2.connect(g);g.connect(master);
  const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;const b=ac.createBiquadFilter();b.type="bandpass";b.frequency.value=f*2;b.Q.value=6;const ng=ac.createGain();ng.gain.setValueAtTime(0.0001,t);ng.gain.exponentialRampToValueAtTime(0.16*v,t+0.05);ng.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.08);s.connect(b);b.connect(ng);ng.connect(master);
  [o,o2,lf,s].forEach(x=>{x.start(t);x.stop(t+dur+0.15)});
 }
 // きらきら（鈴）
 function chime(t,f,v=1){const o=ac.createOscillator(),g=ac.createGain();o.type="sine";o.frequency.value=f;env(g,t,0.003,0.22*v,0.9);o.connect(g);g.connect(master);o.start(t);o.stop(t+1);const o2=ac.createOscillator(),g2=ac.createGain();o2.type="sine";o2.frequency.value=f*2.76;env(g2,t,0.003,0.08*v,0.4);o2.connect(g2);g2.connect(master);o2.start(t);o2.stop(t+0.5)}

 // ---- BGM ----
 const TR={
  calm:{bpm:76,drum:(s,t,b)=>{if(s===0)don(t,0.8);if(s===4&&b%2)don(t,0.45);if(s===6)ka(t,0.28)},fl:0.55},
  fight:{bpm:118,drum:(s,t,b)=>{if(s===0||s===4)don(t,0.95);if(s===2||s===6)ka(t,0.55);if(s===7)don(t,0.5);if(s===3&&b%2)ka(t,0.35)},fl:0.4}
 };
 function newPhrase(tr){ // 笛のフレーズ（2小節）：step位置と音程と長さ
  const n=tr==="fight"?5:4,pos=[0,3,6,8,11,13].slice(0,n+1),out=[];let pi=5+Math.floor(Math.random()*3);
  for(let k=0;k<n;k++){pi+=[-2,-1,1,2][Math.floor(Math.random()*4)];pi=Math.max(3,Math.min(9,pi));out.push({s:pos[k]+(tr==="fight"?0:0),n:pi,d:(pos[k+1]-pos[k])*(tr==="fight"?0.8:1)})}
  out[n-1].n=Math.random()<0.5?5:7;out[n-1].d=(16-out[n-1].s);return out;
 }
 function tick(){
  if(!ac||!scene||duck){return}
  const tr=TR[scene],sd=60/tr.bpm/2;
  while(nextT<ac.currentTime+0.35){
   const s=step%16,b=Math.floor(step/16);
   if(!duck){tr.drum(s%8,nextT,b);
    if(s===0&&b%2===0)phrase=newPhrase(scene);
    if(b%2===0||true){const h=phrase.find(x=>x.s===s&&Math.floor(step/16)%2===0&&(scene==="fight"||Math.random()<0.95));if(h&&Math.floor(step/16)%2===0)fue(nextT,note(h.n),h.d*sd,tr.fl)}}
   nextT+=sd;step++;
  }
 }
 function startBgm(){stopBgm();if(!ac||!scene)return;step=0;nextT=ac.currentTime+0.15;timer=setInterval(tick,120)}
 function stopBgm(){if(timer){clearInterval(timer);timer=null}}
 function setScene(id){
  const s=(id==="s-basho"||id==="s-team")?"fight":"calm";
  if(s===scene)return;scene=s;if(ac&&!duck)startBgm();
 }
 // ---- 効果音 ----
 const ok=()=>ac&&!muted;
 const T=()=>ac.currentTime+0.02;
 return {
  init,scene:setScene,
  tap(){if(!ok())return;clack(T(),0.6)},
  hit(win){if(!ok())return;const t=T();don(t,1);ka(t+0.02,0.6);if(win){chime(t+0.18,note(10),0.8);chime(t+0.3,note(12),0.8)}else{don(t+0.2,0.5,1.4)}},
  jingle(){if(!ok())return;const t=T();don(t,1,1.4);fue(t+0.1,note(7),0.5,0.9);fue(t+0.6,note(9),0.5,0.9);fue(t+1.1,note(10),1.2,1);chime(t+1.1,note(12))},
  gacha(f,label){ // 演出のコマごと
   if(!ok())return;const t=T();
   if(f===0){duck=true;don(t,0.7)}
   if(f===1){don(t,0.8);fue(t,note(5),1.0,0.5,0.8)}
   if(f===2){for(let i=0;i<6;i++)don(t+i*0.09,0.5+i*0.1);don(t+0.6,1.2,1.4)}
   if(f===3){clack(t,1);noise(t,0.5,"highpass",3000,0.5,0.25)}
   if(f===4){noise(t,0.6,"bandpass",1200,0.8,0.3);don(t,0.6)}
   if(f===5){fue(t,note(8),0.5,0.8)}
   if(f===6){[10,12,14].forEach((n,i)=>chime(t+i*0.12,note(n),0.8))}
   if(f===7){don(t,1.1,1.4);fue(t+0.05,note(10),1.1,1);
    const k=label==="SSR"||label==="横綱"?3:label==="SR"||label==="大関"?2:1;
    for(let i=0;i<k*2;i++)chime(t+0.15+i*0.1,note(11+i),0.9)}
  },
  gachaEnd(){duck=false;if(ac&&scene)startBgm()},
  toggle(){muted=!muted;try{localStorage.setItem("sumo-mute",muted?"1":"0")}catch(e){}if(master)master.gain.value=muted?0:0.8;return muted},
  isMuted:()=>muted
 };
})();
