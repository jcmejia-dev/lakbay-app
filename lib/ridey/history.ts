import type {RideyAction} from './actions';
export type LocalMessage={id:string;role:'user'|'assistant';content:string;actions?:RideyAction[];failed?:boolean};
export type Conversation={id:string;updatedAt:number;messages:LocalMessage[]};
export const HISTORY_LIMIT={conversations:3,messages:40,days:30};
export function pruneConversations(conversations:Conversation[],now=Date.now()){
  return conversations.filter(c=>c.updatedAt>now-HISTORY_LIMIT.days*86400000).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,HISTORY_LIMIT.conversations).map(c=>({...c,messages:c.messages.slice(-HISTORY_LIMIT.messages).map(m=>({...m,content:m.content.slice(0,6000)}))}));
}
export function readConversations(owner:string):Conversation[]{
  if(!owner)return [];
  try{
    const raw=localStorage.getItem('lakbay:ridey:'+owner);if(!raw||raw.length>800000)return [];
    const data=JSON.parse(raw) as Conversation[];
    if(!Array.isArray(data)||data.some(c=>typeof c.id!=='string'||typeof c.updatedAt!=='number'||!Array.isArray(c.messages)||c.messages.some(m=>typeof m.id!=='string'||!['user','assistant'].includes(m.role)||typeof m.content!=='string')))return [];
    // Stored actions are not trusted. The UI only accepts known action types and
    // navigator checks stop IDs against its current POI collection.
    const cleaned=pruneConversations(data).map(c=>({...c,messages:c.messages.map(m=>({...m,actions:Array.isArray(m.actions)?m.actions.filter(a=>!!a&&['route','destination','weather','maintenance','stop'].includes(a.type)&&typeof a.label==='string').slice(0,5).map(a=>({...a,label:a.label.slice(0,140)})):undefined}))}));
    // Remove expired/excess history on access, even if no new message is sent.
    saveConversations(owner,cleaned);return cleaned;
  }catch{return [];}
}
export function saveConversations(owner:string,conversations:Conversation[]){
  try{localStorage.setItem('lakbay:ridey:'+owner,JSON.stringify(pruneConversations(conversations)));return true;}catch{return false;}
}
export function clearConversations(owner:string){try{localStorage.removeItem('lakbay:ridey:'+owner);return true;}catch{return false;}}
