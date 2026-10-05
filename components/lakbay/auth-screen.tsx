'use client';

import {useState} from 'react';
import {ArrowLeft, LockKeyhole, ShieldCheck, UserRound} from 'lucide-react';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import WheelLoader from './wheel-loader';
import Brand from './brand';

type SignedIn={name:string;email:string};
type CodePurpose='signup'|'reset';

export default function AuthScreen({user,oauthError}:{user?:SignedIn|null;oauthError?:string}){
  const [tab,setTab]=useState('login'),[name,setName]=useState(user?.name||''),[town,setTown]=useState('');
  const [email,setEmail]=useState(user?.email||''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[newPassword,setNewPassword]=useState('');
  const [step,setStep]=useState<'form'|'verify-signup'|'forgot-email'|'verify-reset'>('form'),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[authBusy,setAuthBusy]=useState(false),[ready,setReady]=useState(false);

  async function post(path:string,payload:Record<string,string>){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json() as {error?:string;message?:string};if(!response.ok)throw Error(result.error||'Please try again.');return result;}

  async function login(e:React.FormEvent){e.preventDefault();setAuthBusy(true);setError('');setNotice('');try{await post('/api/auth/email/password',{email,password});window.location.replace('/');}catch(cause){setError(cause instanceof Error?cause.message:'Could not sign in.');setAuthBusy(false);}}
  async function requestCode(e:React.FormEvent,purpose:CodePurpose){e.preventDefault();setAuthBusy(true);setError('');setNotice('');try{const result=await post('/api/auth/email/request',{email,purpose});setStep(purpose==='signup'?'verify-signup':'verify-reset');setNotice(result.message||'Check your email for a six-digit code.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not send a code.');}finally{setAuthBusy(false);}}
  async function verify(e:React.FormEvent,purpose:CodePurpose){e.preventDefault();setAuthBusy(true);setError('');setNotice('');try{await post('/api/auth/email/verify',{email,code,purpose,password:purpose==='signup'?password:newPassword,name});window.location.replace('/');}catch(cause){setError(cause instanceof Error?cause.message:'Could not verify this code.');setAuthBusy(false);}}
  async function registerProfile(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/rider',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:name,homeTown:town})});const result:{error?:string}=await response.json();if(!response.ok)throw Error(result.error);setReady(true);window.location.replace('/');}catch(cause){setError(cause instanceof Error?cause.message:'Could not create your profile.');setBusy(false);}}
  function changeTab(value:string){setTab(value);setStep('form');setError('');setNotice('');setCode('');setPassword('');}
  function beginForgot(){setStep('forgot-email');setError('');setNotice('');setPassword('');}

  if(ready)return <WheelLoader value={55} label="Profile created. Opening your map…"/>;

  return <div className="auth-page">
    <div className="auth-brand"><Brand/></div>
    <section className="auth-form-card">
      <div className="auth-symbol"><UserRound size={29}/></div>
      <p className="eyebrow">YOUR RIDING COMPANION</p>
      <h1>{user?'Create your rider profile.':'Your next ride starts here.'}</h1>
      <p className="auth-intro">{user?'Complete registration to unlock your map, rides and achievements.':'Sign in or create a Lakbay account to keep your rides available across devices.'}</p>

      {user?<form onSubmit={registerProfile}>
        <label className="field-label">Rider name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={60} required autoComplete="nickname" placeholder="What should we call you?"/></label>
        <label className="field-label">Home city or town <span className="optional-label">optional</span><input value={town} onChange={e=>setTown(e.target.value)} maxLength={100} autoComplete="address-level2" placeholder="e.g. Koronadal"/></label>
        <label className="field-label">Account email<input value={user.email} readOnly type="email"/></label>
        {error&&<p className="inline-error" role="alert">{error}</p>}
        <button className="dark-button auth-submit" disabled={busy}>{busy?'Saving profile…':'Complete registration'}</button>
        <a className="auth-switch-account" href="/api/auth/signout" target="_top">Use a different account</a>
      </form>:<Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="auth-tabs"><TabsTrigger value="login">Log in</TabsTrigger><TabsTrigger value="register">Sign up</TabsTrigger></TabsList>
        <TabsContent value="login">
          {step==='forgot-email'?<form className="auth-provider-form" onSubmit={e=>requestCode(e,'reset')}>
            <button type="button" className="auth-back" onClick={()=>setStep('form')}><ArrowLeft size={16}/>Back to log in</button>
            <h2>Reset your password</h2><p>We’ll email a verification code to your Lakbay account address.</p>
            <label className="field-label">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></label>
            {error&&<p className="inline-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
            <button className="dark-button auth-submit" disabled={authBusy}>{authBusy?'Sending code…':'Send reset code'}</button>
          </form>:step==='verify-reset'?<form className="auth-provider-form" onSubmit={e=>verify(e,'reset')}>
            <button type="button" className="auth-back" onClick={()=>setStep('forgot-email')}><ArrowLeft size={16}/>Change email</button>
            <h2>Choose a new password</h2><p>Enter the six-digit code sent to <strong>{email}</strong>, then set a new Lakbay password.</p>
            <label className="field-label">Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required placeholder="6-digit code"/></label>
            <label className="field-label">New Lakbay password<input type="password" autoComplete="new-password" minLength={10} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required placeholder="At least 10 characters"/></label>
            {error&&<p className="inline-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
            <button className="dark-button auth-submit" disabled={authBusy}>{authBusy?'Updating password…':'Save new password'}</button>
          </form>:<form className="auth-provider-form" onSubmit={login}>
            <h2>Welcome back.</h2><label className="field-label">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></label>
            <label className="field-label">Lakbay password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required maxLength={128} placeholder="Your password"/></label>
            {(error||oauthError)&&<p className="inline-error" role="alert">{error||oauthError}</p>}
            <button className="dark-button auth-submit" disabled={authBusy}>{authBusy?'Signing in…':'Log in'}</button>
            <button type="button" className="text-button auth-forgot" onClick={beginForgot}>Forgot password?</button>
            <div className="auth-divider"><span>or</span></div>
            <a className="google-signin-button" href="/api/auth/google" target="_top"><span className="google-g" aria-hidden="true">G</span>Continue with Google</a>
          </form>}
        </TabsContent>
        <TabsContent value="register">
          {step==='verify-signup'?<form className="auth-provider-form" onSubmit={e=>verify(e,'signup')}>
            <button type="button" className="auth-back" onClick={()=>setStep('form')}><ArrowLeft size={16}/>Edit account details</button>
            <h2>Check your inbox.</h2><p>Enter the six-digit code sent to <strong>{email}</strong> to finish creating your account.</p>
            <label className="field-label">Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required placeholder="6-digit code"/></label>
            {error&&<p className="inline-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
            <button className="dark-button auth-submit" disabled={authBusy}>{authBusy?'Verifying…':'Verify email & create account'}</button>
          </form>:<form className="auth-provider-form" onSubmit={e=>requestCode(e,'signup')}>
            <h2>New to Lakbay?</h2><p>Create a private rider account with your email address.</p>
            <label className="field-label">Rider name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={60} autoComplete="name" placeholder="Your name"/></label>
            <label className="field-label">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com"/></label>
            <label className="field-label">Lakbay password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} placeholder="At least 10 characters"/></label>
            <p className="subtle auth-password-hint">Choose a password for Lakbay. Never enter your Google password here.</p>
            {error&&<p className="inline-error" role="alert">{error}</p>}
            <button className="dark-button auth-submit" disabled={authBusy}>{authBusy?'Sending code…':'Create account'}</button>
            <div className="auth-divider"><span>or</span></div>
            <a className="google-signin-button" href="/api/auth/google" target="_top"><span className="google-g" aria-hidden="true">G</span>Sign up with Google</a>
          </form>}
        </TabsContent>
      </Tabs>}

      <p className="auth-security"><ShieldCheck size={16}/><span>Your ride data is stored under your rider account.</span></p>
      <p className="auth-security"><LockKeyhole size={15}/><span>Lakbay passwords are protected. Google sign-in never shares your Google password with Lakbay.</span></p>
    </section>
    <p className="auth-footer">A good ride starts with getting home safely.</p>
  </div>;
}
