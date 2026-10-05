import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {authSystemOwner,createSession,hashText,saveAuthRecord,cookieValue,sessionCookie} from '@/lib/account-auth';
const config=()=>env as unknown as Record<string,string|undefined>;
function failure(req:Request,reason:string){return Response.redirect(new URL('/?auth_error='+encodeURIComponent(reason),req.url),303);}
export async function GET(req:Request){
  const c=config(),url=new URL(req.url),state=url.searchParams.get('state'),code=url.searchParams.get('code'),saved=cookieValue(req.headers.get('cookie')||'','lakbay_google_state');
  const clear='lakbay_google_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=0';
  if(!c.GOOGLE_CLIENT_ID||!c.GOOGLE_CLIENT_SECRET||!c.AUTH_SESSION_SECRET)return failure(req,'google_setup');
  let appOrigin:string;try{appOrigin=c.APP_BASE_URL?new URL(c.APP_BASE_URL).origin:url.origin;}catch{return failure(req,'google_setup');}
  if(url.origin!==appOrigin)return failure(req,'google_verify');
  if(!state||!saved||state!==saved||!code)return failure(req,'google_verify');
  try{
    const redirectUri=new URL('/api/auth/google/callback',appOrigin).toString();
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:c.GOOGLE_CLIENT_ID,client_secret:c.GOOGLE_CLIENT_SECRET,redirect_uri:redirectUri,grant_type:'authorization_code'})});
    if(!tokenResponse.ok)return failure(req,'google_verify');
    const token=await tokenResponse.json() as {access_token?:string};
    if(!token.access_token)return failure(req,'google_verify');
    const userResponse=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`}});
    if(!userResponse.ok)return failure(req,'google_verify');
    const google=await userResponse.json() as {sub?:string;email?:string;email_verified?:boolean;name?:string};if(typeof google.sub!=='string'||typeof google.email!=='string'||google.email_verified!==true)return failure(req,'google_email');
    const email=google.email.toLowerCase(),emailHash=await hashText(email);
    const index=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'email-index:'+emailHash,'auth-email').first<{data:string}>();
    const id=index?(JSON.parse(index.data) as {userId:string}).userId:`google:${google.sub}`;
    const prior=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'user:'+id,'auth-user').first<{data:string}>();
    const previous=prior?JSON.parse(prior.data):null;
    const user={id,name:previous?.name||google.name||email,email,provider:'google',createdAt:previous?.createdAt||Date.now()};
    await saveAuthRecord('user:'+id,'auth-user',user);
    await saveAuthRecord('email-index:'+emailHash,'auth-email',{userId:id});
    const session=await createSession(id);
    const response=Response.redirect(new URL('/',appOrigin),303);response.headers.append('Set-Cookie',sessionCookie(session));response.headers.append('Set-Cookie',clear);return response;
  }catch{return failure(req,'google_verify');}
}
