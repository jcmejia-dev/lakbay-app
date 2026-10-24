import {getAccountIdentity,type AccountIdentity} from '@/lib/account-auth';
import {getRider} from '@/lib/rider';
import Link from 'next/link';
import AuthScreen from '@/components/lakbay/auth-screen';
import AvatarOnboarding from '@/components/lakbay/avatar-onboarding';
import RideApp from './ride-app';

export const dynamic='force-dynamic';

const STARTUP_TIMEOUT_MS=3500;
class StartupTimeout extends Error{}
function withStartupTimeout<T>(promise:Promise<T>,label:string):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new StartupTimeout(`${label} timed out`)),STARTUP_TIMEOUT_MS);
    promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
}
function Unavailable(){
  return <div className="auth-page"><section className="auth-form-card"><h1>Lakbay cannot reach your account right now.</h1><p>Your data has not been changed. The connection failed or timed out, so Lakbay stopped waiting instead of freezing on startup.</p><Link className="dark-button auth-submit" href="/?retry=1">Try again</Link></section></div>;
}

export default async function Page({searchParams}:{searchParams:Promise<{auth_error?:string}>}){
  const params=await searchParams;
  let user:AccountIdentity|null;
  try{user=await withStartupTimeout(getAccountIdentity(),'Account');}catch{return <Unavailable/>;}
  const authError=params.auth_error==='google_setup'?'Google sign-in is not configured yet. Check the server and Google OAuth settings.':params.auth_error?'Google could not verify this account. Please try again.':undefined;
  if(!user)return <AuthScreen oauthError={authError}/>;
  let rider;
  try{rider=await withStartupTimeout(getRider(user.id),'Rider profile');}catch{return <Unavailable/>;}
  if(!rider)return <AuthScreen user={{name:user.name||'',email:user.email}}/>;
  if(rider.onboardingComplete===false)return <AvatarOnboarding rider={rider} email={user.email}/>;
  return <RideApp initialUser={{name:rider.displayName,email:user.email,provider:user.provider}} initialRider={rider}/>;
}
