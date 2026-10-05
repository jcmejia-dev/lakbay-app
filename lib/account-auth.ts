import {headers} from 'next/headers';
import {database} from '@/lib/storage';

const AUTH_OWNER='__lakbay_auth_system__';
export type AccountIdentity={id:string;name:string;email:string;provider:'google'|'email'};
export function authSystemOwner(){return AUTH_OWNER;}
export async function hashText(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function saveAuthRecord(id:string,kind:string,data:unknown){await database().prepare('INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET kind=excluded.kind,data=excluded.data,updated=excluded.updated').bind(AUTH_OWNER,id,kind,JSON.stringify(data),new Date().toISOString()).run();}

export async function getAccountIdentityFromRequest(request:Request):Promise<AccountIdentity|null>{
  const token=cookieValue(request.headers.get('cookie')||'','lakbay_session');if(!token||token.length>120)return null;
  try{const hash=await hashText(token),row=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(AUTH_OWNER,'session:'+hash,'auth-session').first<{data:string}>();if(!row)return null;const session=JSON.parse(row.data);if(session.expiresAt<Date.now()){await database().prepare('DELETE FROM records WHERE owner=? AND id=?').bind(AUTH_OWNER,'session:'+hash).run();return null;}const userRow=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(AUTH_OWNER,'user:'+session.userId,'auth-user').first<{data:string}>();if(!userRow)return null;const user=JSON.parse(userRow.data);return{id:user.id,name:user.name||user.email,email:user.email,provider:user.provider};}catch{return null;}
}
export async function getAccountIdentity():Promise<AccountIdentity|null>{
  const h=await headers();return getAccountIdentityFromRequest(new Request('https://lakbay.local/',{headers:{cookie:h.get('cookie')||''}}));
}
export function cookieValue(raw:string,name:string){for(const part of raw.split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name)return part.slice(i+1).trim();}return null;}
