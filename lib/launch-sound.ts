'use client';

let context:AudioContext|null=null;
export function playLakbayReveal(){
  if(typeof window==='undefined'||localStorage.getItem('lakbay-launch-sound')==='off')return false;
  try{
    const AudioContextClass=window.AudioContext||(window as any).webkitAudioContext;
    if(!AudioContextClass)return false;
    context??=new AudioContextClass();
    if(context.state==='suspended'){context.resume().then(()=>playLakbayReveal()).catch(()=>{});return false;}
    const now=context.currentTime,master=context.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.19,now+.07);master.gain.exponentialRampToValueAtTime(.0001,now+.85);master.connect(context.destination);
    const length=Math.floor(context.sampleRate*.48),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++){const fade=1-i/length;data[i]=(Math.random()*2-1)*fade*fade;}
    const noise=context.createBufferSource(),filter=context.createBiquadFilter(),air=context.createGain();noise.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(500,now);filter.frequency.exponentialRampToValueAtTime(1800,now+.42);filter.Q.value=.65;air.gain.setValueAtTime(.0001,now);air.gain.exponentialRampToValueAtTime(.4,now+.1);air.gain.exponentialRampToValueAtTime(.0001,now+.5);noise.connect(filter).connect(air).connect(master);noise.start(now);noise.stop(now+.5);
    for(const [frequency,level] of [[740,.48],[1110,.16]] as const){const tone=context.createOscillator(),env=context.createGain();tone.type='sine';tone.frequency.setValueAtTime(frequency,now+.27);tone.frequency.exponentialRampToValueAtTime(frequency*.96,now+.78);env.gain.setValueAtTime(.0001,now+.24);env.gain.exponentialRampToValueAtTime(level,now+.29);env.gain.exponentialRampToValueAtTime(.0001,now+.86);tone.connect(env).connect(master);tone.start(now+.24);tone.stop(now+.88);}
    return true;
  }catch{return false;}
}
