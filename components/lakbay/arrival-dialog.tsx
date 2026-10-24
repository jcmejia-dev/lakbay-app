'use client';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {duration,type Ride} from '@/lib/ride';

export default function ArrivalDialog({ride,onClose,onSave}:{ride:Ride|null;onClose:()=>void;onSave:(rating:number,feedback:string)=>Promise<void>}) {
  const [rating,setRating]=useState(0),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(!ride||typeof window==='undefined'||!('speechSynthesis' in window))return;
    const destination=ride.destination?.name?.trim();
    const message=destination?`You have arrived at ${destination}.`:'You have arrived at your destination.';
    window.speechSynthesis.cancel();
    const speech=new SpeechSynthesisUtterance(message);
    speech.rate=.95;
    speech.pitch=1;
    speech.volume=1;
    window.speechSynthesis.speak(speech);
    return()=>window.speechSynthesis.cancel();
  },[ride?.id]);
  return <Dialog open={!!ride} onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="arrival-dialog"><DialogHeader><DialogTitle>You made it!</DialogTitle><DialogDescription>{ride?.destination?.name||'Your destination'} · {ride?.distance.toFixed(2)} km · {duration(ride?.seconds||0)}</DialogDescription></DialogHeader>
    <div className="arrival-confetti" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:`${i*5.5}%`,animationDelay:`${(i%5)*.07}s`,background:['#a0c34b','#244f3f','#e4b754'][i%3]}}/>)}</div>
    <p>How was your ride?</p><div className="rating-stars" role="group" aria-label="Rate your ride">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} star${n===1?'':'s'}`} aria-pressed={rating===n} onClick={()=>setRating(n)} className={n<=rating?'selected':''}>★</button>)}</div>
    <label className="field-label">Feedback (optional)<textarea maxLength={1000} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What would you remember for next time?"/></label>
    {error&&<p className="inline-error" role="alert">{error}</p>}<div className="actions"><button className="dark-button" disabled={!rating||busy} onClick={async()=>{setBusy(true);setError('');try{await onSave(rating,feedback.trim());onClose();}catch(e){setError(e instanceof Error?e.message:'Could not save rating');}finally{setBusy(false);}}}>{busy?'Saving…':'Save rating'}</button><button className="secondary" disabled={busy} onClick={onClose}>Skip</button></div>
  </DialogContent></Dialog>;
}
