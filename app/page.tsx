import {getAccountIdentity} from '@/lib/account-auth';
import {getRider} from '@/lib/rider';
import AuthScreen from '@/components/lakbay/auth-screen';
import RideApp from './ride-app';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAccountIdentity();if(!user)return <AuthScreen/>;let rider;try{rider=await getRider(user.id);}catch{return <div className="auth-page"><section className="auth-form-card"><h1>Your account is temporarily unavailable.</h1><p>Please reload to try again. Your saved rides have not been changed.</p><a className="dark-button auth-submit" href="/">Retry</a></section></div>;}if(!rider)return <AuthScreen user={{name:user.name||'',email:user.email}}/>;return <RideApp initialUser={{name:rider.displayName,email:user.email,provider:user.provider}} initialRider={rider}/>;}
