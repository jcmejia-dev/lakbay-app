'use client';
import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,Plus,Trash2,RefreshCw,Sparkles} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import type {RideyContext} from '@/lib/ridey/context';
import {minimumContext} from '@/lib/ridey/context';
import type {RideyAction} from '@/lib/ridey/actions';
import {readConversations,saveConversations,clearConversations,pruneConversations,type Conversation,type LocalMessage} from '@/lib/ridey/history';
const SUGGESTIONS=['Do I have enough fuel for my route?','What should I bring for this ride?','What should I do if my motorcycle breaks down?','Suggest somewhere to ride.','Will it rain at my destination?','Find a gas stop for this route.','Help me prepare for a long ride.'];
function newConversation():Conversation{return {id:crypto.randomUUID(),updatedAt:Date.now(),messages:[]};}
function ResponseSections({text}:{text:string}){
  return <div className="ridey-response">{text.split('\n').filter(Boolean).map((line,i)=>{
    const trimmed=line.replace(/^#{1,3}\s*/,'').replace(/\*\*/g,'');
    const heading=/^(Summary|Warning|Checklist|Fuel|Weather|Recommendation|Nearby stop|App data|Estimates|AI suggestions):?$/i.test(trimmed.trim());
    return heading?<h3 key={i}>{trimmed}</h3>:<p key={i}>{trimmed}</p>;
  })}</div>;
}
export default function RideyChat({owner,context,running,onAction}:{owner:string;context:RideyContext;running:boolean;onAction:(a:RideyAction)=>void}){
  const [open,setOpen]=useState(false),[conversations,setConversations]=useState<Conversation[]>([]),[selected,setSelected]=useState(''),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[available,setAvailable]=useState<boolean|null>(null),[status,setStatus]=useState(''),[storageError,setStorageError]=useState(false);
  const abort=useRef<AbortController|null>(null),tail=useRef<HTMLDivElement|null>(null),inputRef=useRef<HTMLInputElement|null>(null);
  const current=conversations.find(c=>c.id===selected),messages=current?.messages||[];
  useEffect(()=>{
    // Hydration reads browser storage only after mount.
    abort.current?.abort();const history=readConversations(owner),first=history[0]||newConversation();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(history.length?history:[first]);setSelected(first.id);setBusy(false);setError('');
    return()=>abort.current?.abort();
  },[owner]);
  // Close immediately when recording starts; do not allow chat while moving.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{if(running){abort.current?.abort();setOpen(false);setBusy(false);}},[running]);
  useEffect(()=>{if(open)tail.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'end'});},[messages.length,busy,open]);
  // Reset server availability each time the user opens this sheet.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{if(!open)return;const controller=new AbortController();setAvailable(null);fetch('/api/ridey',{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json() as {available:boolean;message:string};if(!r.ok)throw Error('Ridey is temporarily unavailable.');setAvailable(data.available);setStatus(data.message);}).catch(()=>{if(!controller.signal.aborted){setAvailable(false);setStatus('Ridey is temporarily unavailable. Reopen to retry.');}});return()=>controller.abort();},[open]);
  function updateConversation(id:string,next:LocalMessage[]){
    const updated=pruneConversations(conversations.map(c=>c.id===id?{...c,messages:next,updatedAt:Date.now()}:c));setConversations(updated);setStorageError(!saveConversations(owner,updated));
  }
  async function send(content:string,retry=false){
    if(busy||running||!owner||!current||available===false)return;
    const text=content.trim().slice(0,2000);if(!text)return;
    const id=current.id;
    // Retry sends the original user turn, not another duplicate message.
    const next=retry?messages.map((m,i)=>i===messages.length-1?{...m,failed:false}:m):[...messages,{id:crypto.randomUUID(),role:'user' as const,content:text}];
    updateConversation(id,next);setInput('');setError('');setBusy(true);const controller=new AbortController();abort.current=controller;
    const history=next.filter(m=>!m.failed).slice(-12).map(({role,content})=>({role,content:content.slice(0,2000)}));
    const topics=history.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join(' ');
    try{
      const response=await fetch('/api/ridey',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({messages:history,context:minimumContext(topics,context)})});
      const data=await response.json() as {id:string;content:string;actions:RideyAction[];error?:string;code?:string};
      if(!response.ok){if(data.code==='unconfigured'){setAvailable(false);setStatus(data.error||'Ridey is not configured.');}throw Error(data.error||'Ridey could not respond.');}
      updateConversation(id,[...next,{id:data.id,role:'assistant',content:data.content,actions:data.actions}]);
    }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Ridey could not respond.');updateConversation(id,next.map((m,i)=>i===next.length-1?{...m,failed:true}:m));}}
    finally{if(abort.current===controller){setBusy(false);abort.current=null;}}
  }
  function startNew(){abort.current?.abort();const conversation=newConversation();const updated=pruneConversations([conversation,...conversations]);setConversations(updated);setSelected(conversation.id);setStorageError(!saveConversations(owner,updated));setError('');setBusy(false);setInput('');}
  const lastMessage=messages.at(-1);
  return <><button className="ridey-entry" onClick={()=>setOpen(true)} disabled={!owner||running} aria-label={running?'Stop safely before using Ridey':'Open Ridey companion'} title={running?'Pause safely to chat':'Ridey companion'}><MessageCircle size={19}/><span>Ridey</span></button><Sheet open={open} onOpenChange={value=>{setOpen(value);if(value)requestAnimationFrame(()=>inputRef.current?.focus());}}><SheetContent side="right" className="ridey-sheet"><SheetHeader><SheetTitle><Sparkles size={20}/> Ridey</SheetTitle><SheetDescription>Your Lakbay riding companion. Stop safely before chatting.</SheetDescription></SheetHeader><div className="ridey-history-tools"><button disabled={busy} onClick={startNew}><Plus size={15}/>New chat</button><button disabled={busy} onClick={()=>{setStorageError(!clearConversations(owner));const c=newConversation();setConversations([c]);setSelected(c.id);setError('');}}><Trash2 size={15}/>Clear history</button>{conversations.length>1&&<select aria-label="Saved Ridey conversation" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setError('');}}>{conversations.map((c,i)=><option value={c.id} key={c.id}>{c.messages[0]?.content.slice(0,28)||`New conversation ${i+1}`}</option>)}</select>}</div><p className="ridey-storage-note">Private to this account on this browser · 3 chats · 40 messages each · expires after 30 days</p>{storageError&&<p role="status" className="inline-tip">Browser storage is unavailable. This conversation will last until the page closes.</p>}{available===false&&<div className="ridey-unavailable" role="status"><MessageCircle size={24}/><strong>Ridey is taking a pit stop</strong><p>{status}</p><small>Keep using Lakbay’s route, fuel, weather and maintenance tools.</small></div>}<div className="ridey-messages" role="log" aria-label="Ridey conversation" aria-live="polite">{!messages.length&&<div className="ridey-welcome"><span className="ridey-avatar"><Sparkles size={25}/></span><h2>A little help for the road.</h2><p>Ask about your route, fuel or ride preparation.</p><div className="ridey-prompts">{SUGGESTIONS.map(prompt=><button key={prompt} disabled={available!==true||busy} onClick={()=>void send(prompt)}>{prompt}</button>)}</div></div>}{messages.map(m=><article key={m.id} className={'ridey-message '+m.role}><span className="ridey-message-author">{m.role==='user'?'You':'Ridey · AI suggestion'}</span>{m.role==='assistant'?<ResponseSections text={m.content}/>:<p>{m.content}</p>}{m.role==='assistant'&&!!m.actions?.length&&<div className="ridey-actions">{m.actions.map((a,i)=><button key={a.type+':'+i} onClick={()=>{setOpen(false);onAction(a);}}>{a.label}</button>)}</div>}{m.failed&&<small>Not answered yet</small>}</article>)}{busy&&<div className="ridey-typing" role="status"><span/><span/><span/> Ridey is thinking…</div>}<div ref={tail}/></div>{error&&<div className="ridey-error" role="alert"><p>{error}</p>{lastMessage?.role==='user'&&lastMessage.failed&&<button disabled={busy||available===false} onClick={()=>void send(lastMessage.content,true)}><RefreshCw size={15}/>Retry</button>}</div>}<form className="ridey-composer" onSubmit={e=>{e.preventDefault();void send(input);}}><input ref={inputRef} aria-label="Message Ridey" placeholder={available===false?'Ridey is unavailable':'Ask Ridey…'} value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} disabled={busy||available!==true}/><button className="dark-button" aria-label="Send to Ridey" disabled={busy||available!==true||!input.trim()}><Send size={18}/></button></form><p className="ridey-disclaimer">App data can be incomplete. Fuel, weather and ETA are estimates. AI suggestions can be wrong.</p></SheetContent></Sheet></>;
}
