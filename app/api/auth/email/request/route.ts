import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {authSystemOwner,hashText,saveAuthRecord} from '@/lib/account-auth';

type Purpose='signup'|'reset';
const config=()=>env as unknown as Record<string,string|undefined>;
const validEmail=(email:string)=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function POST(req:Request){
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
  const c=config();
  if(!c.AUTH_SESSION_SECRET||!c.RESEND_API_KEY||!c.EMAIL_FROM)return Response.json({error:'Email verification is not configured. Set the Cloudflare email settings before enabling email accounts.'},{status:503});
  try{
    const body=await req.json() as {email?:string;purpose?:Purpose};
    const email=String(body.email||'').trim().toLowerCase(),purpose=body.purpose;
    if(!validEmail(email))return Response.json({error:'Enter a valid email address.'},{status:400});
    if(purpose!=='signup'&&purpose!=='reset')return Response.json({error:'Choose sign up or password reset.'},{status:400});
    const emailKey=await hashText(email),id='email-code:'+emailKey;
    const previous=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),id,'auth-code').first<{data:string}>();
    if(previous&&Date.now()-JSON.parse(previous.data).sentAt<30000)return Response.json({error:'Wait 30 seconds before requesting another code.'},{status:429});
    // Do not reveal whether an address is registered. For a reset request, only
    // send a code when a Lakbay password account exists.
    const index=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'email-index:'+emailKey,'auth-email').first<{data:string}>();
    const accountId=index?(JSON.parse(index.data) as {userId:string}).userId:'email:'+emailKey;
    const account=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'user:'+accountId,'auth-user').first<{data:string}>();
    const password=await database().prepare('SELECT id FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'password:'+accountId,'auth-password').first<{id:string}>();
    if(purpose==='reset'&&(!account||!password))return Response.json({ok:true,message:'If a Lakbay account exists for this address, a code is on its way.'});
    const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
    const codeHash=await hashText(`${c.AUTH_SESSION_SECRET}:${purpose}:${email}:${code}`);
    await saveAuthRecord(id,'auth-code',{email,purpose,codeHash,sentAt:Date.now(),expiresAt:Date.now()+10*60_000,attempts:0});
    const title=purpose==='signup'?'Verify your Lakbay email':'Reset your Lakbay password';
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:c.EMAIL_FROM,to:[email],subject:title,html:`<div style="font-family:Arial,sans-serif;color:#193d31"><h2>${title}</h2><p>Enter this code in Lakbay:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`})});
    if(!response.ok){await database().prepare('DELETE FROM records WHERE owner=? AND id=?').bind(authSystemOwner(),id).run();return Response.json({error:'Could not send the verification code. Check the email settings and try again.'},{status:503});}
    return Response.json({ok:true,message:'If this address can receive Lakbay codes, one is on its way.'});
  }catch{return Response.json({error:'Could not send a code. Try again shortly.'},{status:503});}
}
