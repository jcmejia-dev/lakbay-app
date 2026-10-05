import {database} from '@/lib/storage';
import {authSystemOwner,createSession,hashText,sessionCookie,verifyPassword} from '@/lib/account-auth';

export async function POST(req:Request){
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
  try{
    const body=await req.json() as {email?:string;password?:string};
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length>128)return Response.json({error:'Enter your email and password.'},{status:400});
    const emailKey=await hashText(email);
    const index=await database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'email-index:'+emailKey,'auth-email').first<{data:string}>();
    const userId=index?(JSON.parse(index.data) as {userId:string}).userId:'email:'+emailKey;
    const [user,passwordRow]=await Promise.all([
      database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'user:'+userId,'auth-user').first<{data:string}>(),
      database().prepare('SELECT data FROM records WHERE owner=? AND id=? AND kind=?').bind(authSystemOwner(),'password:'+userId,'auth-password').first<{data:string}>(),
    ]);
    if(!user||!passwordRow||!await verifyPassword(password,JSON.parse(passwordRow.data)))return Response.json({error:'Email or password is incorrect.'},{status:401});
    const token=await createSession(userId),response=Response.json({ok:true});response.headers.append('Set-Cookie',sessionCookie(token));return response;
  }catch{return Response.json({error:'Could not sign in right now. Please try again.'},{status:503});}
}
