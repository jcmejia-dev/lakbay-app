'use client';
import {useEffect,useRef,useState} from 'react';
import {Bell,CheckCheck,Mail,MailOpen,Check,Sparkles} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {toast} from 'sonner';
import {orderedNotices,mergeRead,sentTime,counterLabel,notificationTabs,type InboxState,type RideNotice} from '@/lib/notifications/types';
import {setBadge,enablePhoneAlerts,disablePhoneAlerts} from '@/lib/notifications/client';
import {useInbox} from '@/lib/notifications/use-inbox';
import {useUpdates} from '@/lib/pwa/use-updates';
export type {InboxState,RideNotice} from '@/lib/notifications/types';

type Props={items:RideNotice[];state:InboxState;onChange:(state:InboxState)=>Promise<void>;onNavigate:(tab:string)=>void;ready:boolean;owner:string;hasActiveRide:()=>boolean;prepareUpdate:()=>Promise<void>};
export default function Notifications({items:legacy,state,onChange,onNavigate,ready,owner,hasActiveRide,prepareUpdate}:Props){
  const [open,setOpen]=useState(false),[saving,setSaving]=useState(false),[permissionBusy,setPermissionBusy]=useState(false);
  const {items:saved,refresh}=useInbox(owner,state,onChange);
  const updates=useUpdates(ready,hasActiveRide,prepareUpdate);
  // Server IDs/timestamps win; legacy ride notices remain available before a sync.
  const items=orderedNotices([...legacy.filter(n=>n.time>0),...saved]);
  const unread=items.filter(n=>!state.read.includes(n.id));const latest=items.find(n=>n.kind==='update');
  const current=useRef({state,onChange,onNavigate});useEffect(()=>{current.current={state,onChange,onNavigate};},[state,onChange,onNavigate]);
  useEffect(()=>{if(ready)setBadge(unread.length);},[ready,unread.length]);
  async function mark(ids:string[]){const next={...current.current.state,read:mergeRead(current.current.state.read,ids)};try{await current.current.onChange(next);}catch{toast.error('Read status could not be saved. Please retry.');}}
  useEffect(()=>{if(!ready)return;const navigate=(id:string,tab:string)=>{if(!notificationTabs.has(tab))return;if(id)mark([id]);if(tab==='notifications')setOpen(true);else{setOpen(false);current.current.onNavigate(tab);}refresh();};const message=(event:MessageEvent)=>{if(event.data?.type==='OPEN_NOTIFICATION')navigate(event.data.id,event.data.tab);};navigator.serviceWorker?.addEventListener('message',message);
    const url=new URL(window.location.href),tab=url.searchParams.get('view'),id=url.searchParams.get('notification');if(tab&&notificationTabs.has(tab)){navigate(id||'',tab);url.searchParams.delete('view');url.searchParams.delete('notification');window.history.replaceState(null,'',url);}
    return()=>navigator.serviceWorker?.removeEventListener('message',message);
  },[ready,refresh]);
  async function settings(next:InboxState){setSaving(true);try{await onChange(next);}catch{toast.error('Could not save notification settings. Please retry.');}finally{setSaving(false);}}
  async function enable(){setPermissionBusy(true);try{await enablePhoneAlerts(true);await settings({...current.current.state,browser:true});toast.success('Phone alerts enabled for this device.');}catch(error){toast.info((error as Error).message);}finally{setPermissionBusy(false);}}
  async function disable(){setPermissionBusy(true);try{await disablePhoneAlerts();await settings({...current.current.state,browser:false});}catch(error){toast.error((error as Error).message);}finally{setPermissionBusy(false);}}
  async function update(){if(hasActiveRide()&&!window.confirm('Stop safely before updating. Lakbay will pause and save your active ride, then reload. You can resume the saved draft afterward. Continue?'))return;try{await updates.apply();}catch(error){toast.error((error as Error).message);}}
  return <><button className="notification-bell" aria-label={`Notifications, ${unread.length} unread`} onClick={()=>{setOpen(true);refresh();}}><Bell size={20}/>{unread.length>0&&<span>{counterLabel(unread.length)}</span>}</button><Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" className="map-info-sheet"><SheetHeader><SheetTitle>Notifications</SheetTitle><SheetDescription>App updates, rides and motorcycle care, in one place.</SheetDescription></SheetHeader><div className="notification-body"><div className="notification-heading"><span>{unread.length} unread</span><button disabled={saving||!unread.length} onClick={()=>mark(items.map(n=>n.id))}><CheckCheck size={17}/>Mark all read</button></div>
    {!items.length?<div className="notification-empty"><Bell size={32}/><h3>You’re all caught up.</h3><p>Saved rides, milestones, and service reminders appear here.</p></div>:items.map(n=>{const read=state.read.includes(n.id),Icon=read?MailOpen:Mail;return <div key={n.id}><button className={'notification-item '+(read?'read':'unread')} onClick={()=>{if(!read)mark([n.id]);if(n.tab!=='notifications'){setOpen(false);onNavigate(n.tab);}}}><span className="icon-box" aria-label={read?'Read':'Unread'}><Icon size={20}/></span><div><h3>{n.title}{n.id===latest?.id&&<span className="notification-latest"><Sparkles size={11}/>Latest</span>}</h3><p>{n.body}</p><small><time dateTime={new Date(n.time).toISOString()} title={new Date(n.time).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' (Philippine time)'}>{sentTime(n.time)}</time></small></div>{!read&&<span className="unread-dot"/>}</button>{n.kind==='update'&&n.id===latest?.id&&<div className="notification-update-action">{updates.available?<><p>A newer Lakbay build is ready. Update when you’re safely stopped.</p><button className="dark-button" disabled={updates.applying} onClick={()=>{mark([n.id]);update();}}>{updates.applying?'Updating…':'Update app'}</button></>:<p>No newer app worker is waiting. Lakbay checks for updates when you return to the app.</p>}</div>}</div>;})}
    <div className="notification-settings"><h3>Phone alerts</h3><p>Receive app updates, achievements and important maintenance reminders, including while Lakbay is closed, where Web Push is supported. Delivery and app-icon badges depend on your browser and device.</p><button className="secondary" disabled={saving||permissionBusy} onClick={()=>state.browser?disable():enable()}>{permissionBusy?'Connecting…':state.browser?<><Check size={17}/>Enabled · turn off</>:<><Bell size={17}/>Enable phone alerts</>}</button>{state.browser&&<button className="small-button" disabled={permissionBusy} onClick={enable}>Reconnect this device</button>}<p className="subtle">If permission is blocked, allow notifications in browser/site settings. On iPhone or iPad, use a supported version and add Lakbay to the Home Screen first.</p></div></div></SheetContent></Sheet></>;
}
