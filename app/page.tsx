import {getAccountIdentity} from '@/lib/account-auth';
import {getRider} from '@/lib/rider';
import Link from 'next/link';
import AuthScreen from '@/components/lakbay/auth-screen';
import RideApp from './ride-app';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{auth_error?:string}>}){const params=await searchParams,user=await getAccountIdentity();const authError=params.auth_error==='google_setup'?'Google sign-in is not configured yet. Check the server and Google OAuth settings.':params.auth_error?'Google could not verify this account. Please try again.':undefined;if(!user)return <AuthScreen oauthError={authError}/>;let rider;try{rider=await getRider(user.id);}catch{return <div className="auth-page"><section className="auth-form-card"><h1>Your account is temporarily unavailable.</h1><p>Please reload to try again. Your saved rides have not been changed.</p><Link className="dark-button auth-submit" href="/">Retry</Link></section></div>;}if(!rider)return <AuthScreen user={{name:user.name||'',email:user.email}}/>;return <RideApp initialUser={{name:rider.displayName,email:user.email,provider:user.provider}} initialRider={rider}/>;}
