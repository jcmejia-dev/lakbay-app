import {env} from 'cloudflare:workers';
import {database} from '@/lib/storage';
import {authSystemOwner,createPasswordRecord,createSession,hashText,saveAuthRecord,sessionCookie} from '@/lib/account-auth';

type Purpose='signup'|'reset';
const config=()=>env as unknown as Record<string,string|undefined>;
const validEmail=(email:string)=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword=(password:string)=>password.length>=10&&password.length<=128;

export async function POST(req:Request){
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
  const secret=config().AUTH_SESSION_SECRET;
  if(!secret)return Response.json({error:'Account sign-in is not configured yet.'},{status:503});
  try{
    const body=await req.json() as {email?:string;code?:string;purpose?:Purpose;password?:string;name?:string};
    const email=String(body.email||'').trim().toLowerCase(),code=String(body.code||''),purpose=body.purpose;
    if(!validEmail(email)||!/^\d{6}$/.test(code)||(purpose!=='signup'&&purpose!=='reset'))return Response.json({error:'Enter the email address and six-digit code.'},{status:400});
    if(!validPassword(String(body.password||'')))return Response.json({error:'Use a password between 10 and 128 characters.'},{status:400});
    const name=String(body.name||'').trim();
    if(purpose==='signup'&&(name.length<2||name.length>60))return Response.json({error:'Enter a rider name between 2 and 60 characters.'},{status:400});
    const emailKey=await hashText(email),recordId='email-code:'+emailKey;
    const row=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),recordId,'auth-code').first<{data:string}>();
    if(!row)return Response.json({error:'That code expired. Request a new one.'},{status:400});
    const record=JSON.parse(row.data) as {purpose:Purpose;email:string;codeHash:string;expiresAt:number;attempts:number};
    if(record.purpose!==purpose||record.email!==email)return Response.json({error:'That code expired. Request a new one.'},{status:400});
    if(record.expiresAt<Date.now()||record.attempts>=5){await database().prepare('DELETE FROM records WHERE owner=? AND id=?').bind(authSystemOwner(),recordId).run();return Response.json({error:'That code expired. Request a new one.'},{status:400});}
    const supplied=await hashText(`${secret}:${purpose}:${email}:${code}`);
    if(supplied!==record.codeHash){record.attempts+=1;await saveAuthRecord(recordId,'auth-code',record);return Response.json({error:'That code is not correct.'},{status:400});}
    await database().prepare('DELETE FROM records WHERE owner=? AND id=?').bind(authSystemOwner(),recordId).run();
    const userId='email:'+emailKey;
    let sessionUserId=userId;
    if(purpose==='signup'){
      const emailIndex=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'email-index:'+emailKey,'auth-email').first<{data:string}>();
      const accountId=emailIndex?(JSON.parse(emailIndex.data) as {userId:string}).userId:userId;
      const existing=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'user:'+accountId,'auth-user').first<{data:string}>();
      const existingPassword=await database().prepare('SELECT id FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'password:'+accountId,'auth-password').first<{id:string}>();
      if(existingPassword)return Response.json({error:'A Lakbay password already exists for this email. Log in or reset your password.'},{status:409});
      const passwordRecord=await createPasswordRecord(String(body.password));
      if(!existing)await saveAuthRecord('user:'+accountId,'auth-user',{id:accountId,name,email,provider:'email',createdAt:Date.now()});
      await saveAuthRecord('password:'+accountId,'auth-password',passwordRecord);
      await saveAuthRecord('email-index:'+emailKey,'auth-email',{userId:accountId});
      sessionUserId=accountId;
    }else{
      const userRow=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'email-index:'+emailKey,'auth-email').first<{data:string}>();
      if(!userRow)return Response.json({error:'No Lakbay password account was found for this email.'},{status:400});
      const {userId:accountId}=JSON.parse(userRow.data) as {userId:string};
      const passwordRecord=await createPasswordRecord(String(body.password));
      await saveAuthRecord('password:'+accountId,'auth-password',passwordRecord);
      sessionUserId=accountId;
    }
    const token=await createSession(sessionUserId);
    const response=Response.json({ok:true});response.headers.append('Set-Cookie',sessionCookie(token));return response;
  }catch{return Response.json({error:'Could not verify this code. Please try again.'},{status:503});}
}
