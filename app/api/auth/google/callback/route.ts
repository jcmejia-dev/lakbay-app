import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {authSystemOwner,hashText,saveAuthRecord,cookieValue} from '@/lib/account-auth';
const config=()=>env as unknown as Record<string,string|undefined>;
function failure(req:Request,reason:string){return Response.redirect(new URL('/?auth_error='+encodeURIComponent(reason),req.url),303);}
function sessionCookie(token:string){return `lakbay_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;}
export async function GET(req:Request){
  const c=config(),url=new URL(req.url),state=url.searchParams.get('state'),code=url.searchParams.get('code'),saved=cookieValue(req.headers.get('cookie')||'','lakbay_google_state');
  const clear='lakbay_google_state=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=0';
  if(!c.GOOGLE_CLIENT_ID||!c.GOOGLE_CLIENT_SECRET||!c.AUTH_SESSION_SECRET)return failure(req,'google_setup');
  if(!state||!saved||state!==saved||!code)return failure(req,'google_verify');
  try{
    const redirectUri=new URL('/api/auth/google/callback',req.url).toString();
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:c.GOOGLE_CLIENT_ID,client_secret:c.GOOGLE_CLIENT_SECRET,redirect_uri:redirectUri,grant_type:'authorization_code'})});
    if(!tokenResponse.ok)return failure(req,'google_verify');
    const token:any=await tokenResponse.json();
    const userResponse=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`}});
    if(!userResponse.ok)return failure(req,'google_verify');
    const google:any=await userResponse.json();if(!google.sub||!google.email||google.email_verified!==true)return failure(req,'google_email');
    const id=`google:${google.sub}`,user={id,name:google.name||google.email,email:String(google.email).toLowerCase(),provider:'google',createdAt:Date.now()};
    const prior=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'user:'+id,'auth-user').first<{data:string}>();
    if(prior)user.createdAt=JSON.parse(prior.data).createdAt||user.createdAt;
    await saveAuthRecord('user:'+id,'auth-user',user);
    const session=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),hash=await hashText(session);
    await saveAuthRecord('session:'+hash,'auth-session',{userId:id,expiresAt:Date.now()+30*86400000});
    const response=Response.redirect(new URL('/',req.url),303);response.headers.append('Set-Cookie',sessionCookie(session));response.headers.append('Set-Cookie',clear);return response;
  }catch{return failure(req,'google_verify');}
}
