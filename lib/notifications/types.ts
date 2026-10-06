export type InboxState={read:string[];browser:boolean};
export type RideNotice={id:string;title:string;body:string;tab:string;time:number;kind:'ride'|'badge'|'service'|'update'|'test';version?:string;maintenanceStage?:'soon'|'due'};
export const NOTICE_LIMIT=200;
export function orderedNotices(items:RideNotice[]){return [...new Map(items.map(n=>[n.id,n])).values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id)).slice(0,NOTICE_LIMIT);}
export function unreadCount(items:RideNotice[],read:string[]){const seen=new Set(read);return orderedNotices(items).filter(n=>!seen.has(n.id)).length;}
export function counterLabel(count:number){return count>99?'99+':String(count);}
export function mergeRead(previous:string[],next:string[]){return [...new Set([...previous,...next])].slice(-1000);}
export function sentTime(time:number,now=Date.now()){
  const day=(t:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(t);
  const date=day(time)===day(now)?'Today':day(time)===day(now-86400000)?'Yesterday':new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',...(new Date(time+28800000).getUTCFullYear()!==new Date(now+28800000).getUTCFullYear()?{year:'numeric' as const}:{})}).format(time);
  return `${date} · ${new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit',hour12:true}).format(time)}`;
}
export const notificationTabs=new Set(['ride','journal','badges','garage','profile','notifications']);
