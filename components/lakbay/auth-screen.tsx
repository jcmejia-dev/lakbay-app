'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WheelLoader from './wheel-loader';
import Brand from './brand';

type SignedIn = { name: string; email: string };

export default function AuthScreen({ user }: { user?: SignedIn | null }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState(user?.name || '');
  const [town, setTown] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(location.search).get('auth_error');
    if (reason === 'google_setup') {
      setError('Google sign-in is not configured yet. Please try again later.');
    } else if (reason) {
      setError('Google could not verify this account. Please try again.');
    }
  }, []);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, homeTown: town }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw Error(result.error);
      setReady(true);
      window.location.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your profile.');
      setBusy(false);
    }
  }

  if (ready) return <WheelLoader value={55} label="Profile created. Opening your map…" />;

  return (
    <div className="auth-page">
      <div className="auth-brand"><Brand /></div>
      <section className="auth-form-card">
        <div className="auth-symbol"><UserRound size={29} /></div>
        <p className="eyebrow">YOUR RIDING COMPANION</p>
        <h1>{user ? 'Create your rider profile.' : 'Your next ride starts here.'}</h1>
        <p className="auth-intro">
          {user
            ? 'Complete registration to unlock your map, rides and achievements.'
            : 'Sign in or create an account with Google to keep your rides available across devices.'}
        </p>

        {user ? (
          <form onSubmit={register}>
            <label className="field-label">
              Rider name
              <input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required autoComplete="nickname" placeholder="What should we call you?" />
            </label>
            <label className="field-label">
              Home city or town <span className="optional-label">optional</span>
              <input value={town} onChange={e => setTown(e.target.value)} maxLength={100} autoComplete="address-level2" placeholder="e.g. Koronadal" />
            </label>
            <label className="field-label">
              Google account email
              <input value={user.email} readOnly type="email" />
            </label>
            {error && <p className="inline-error" role="alert">{error}</p>}
            <button className="dark-button auth-submit" disabled={busy}>
              {busy ? 'Creating profile…' : 'Complete registration'}
            </button>
            <a className="auth-switch-account" href="/api/auth/signout" target="_top">Use a different Google account</a>
          </form>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="auth-tabs">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="register">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="auth-provider-form">
                <h2>Welcome back.</h2>
                <p>Continue securely with your Google account.</p>
                <a className="google-signin-button" href="/api/auth/google" target="_top">
                  <span className="google-g" aria-hidden="true">G</span>
                  Continue with Google
                </a>
                {error && <p className="inline-error" role="alert">{error}</p>}
                <a className="google-recovery-link" href="https://accounts.google.com/signin/recovery" target="_blank" rel="noreferrer">
                  Forgot your Google password?
                </a>
              </div>
            </TabsContent>
            <TabsContent value="register">
              <div className="auth-provider-form">
                <h2>New to Lakbay?</h2>
                <p>Use your Google account to create a private rider account. You’ll add your rider name next.</p>
                <a className="google-signin-button" href="/api/auth/google" target="_top">
                  <span className="google-g" aria-hidden="true">G</span>
                  Create account with Google
                </a>
                {error && <p className="inline-error" role="alert">{error}</p>}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <p className="auth-security"><ShieldCheck size={16} /><span>Your ride data is stored under your rider account.</span></p>
        <p className="auth-security"><LockKeyhole size={15} /><span>Google handles sign-in and password recovery. Lakbay never asks for your Google password.</span></p>
      </section>
      <p className="auth-footer">A good ride starts with getting home safely.</p>
    </div>
  );
}
