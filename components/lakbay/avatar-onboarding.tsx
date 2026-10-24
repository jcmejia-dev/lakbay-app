'use client';

import {useState} from 'react';
import {Bike, Camera, Check, Navigation, UserRound} from 'lucide-react';
import ProfileAvatar from './profile-avatar';
import Brand from './brand';
import type {RiderProfile} from '@/lib/profile';

type AvatarMode='arrow'|'rider'|'bike'|'photo';

export default function AvatarOnboarding({rider,email}:{rider:RiderProfile;email:string}){
  const [avatar,setAvatar]=useState<AvatarMode>(rider.mapAvatar||'rider');
  const [photoVersion,setPhotoVersion]=useState(rider.photoVersion||'');
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  const preview:RiderProfile={...rider,mapAvatar:avatar,photoVersion};

  async function saveProfile(next:Partial<RiderProfile>){
    const response=await fetch('/api/rider',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      displayName:rider.displayName,
      homeTown:rider.homeTown,
      mapAvatar:avatar,
      photoVersion,
      onboardingComplete:false,
      ...next,
    })});
    const result=await response.json() as {error?:string;rider?:RiderProfile};
    if(!response.ok)throw Error(result.error||'Could not save your rider profile.');
    return result.rider;
  }

  async function uploadPhoto(file:File){
    setError('');setMessage('');
    if(file.size>10000000){setError('Choose a photo smaller than 10 MB.');return;}
    setUploading(true);
    try{
      const bitmap=await createImageBitmap(file);
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('Photo processing is unavailable on this device.');
      const side=Math.min(bitmap.width,bitmap.height);
      ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,256,256);
      bitmap.close();
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Could not process this photo.')),'image/jpeg',.85));
      const response=await fetch('/api/avatar',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});
      const result=await response.json() as {error?:string};
      if(!response.ok)throw Error(result.error||'Could not upload your photo.');
      const version=String(Date.now());
      setPhotoVersion(version);setAvatar('photo');
      await saveProfile({mapAvatar:'photo',photoVersion:version,onboardingComplete:false});
      setMessage('Photo ready. Looking good!');
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not read this photo. Try JPG or PNG.');}
    finally{setUploading(false);}
  }

  async function finish(useSelection=true){
    setSaving(true);setError('');setMessage('');
    try{
      await saveProfile({mapAvatar:useSelection?avatar:'rider',photoVersion:useSelection?photoVersion:'',onboardingComplete:true});
      window.location.replace('/');
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not finish setup.');setSaving(false);}
  }

  return <div className="auth-page">
    <div className="auth-brand"><Brand/></div>
    <section className="auth-form-card">
      <div className="auth-symbol"><UserRound size={29}/></div>
      <p className="eyebrow">WELCOME TO LAKBAY</p>
      <h1>Make Lakbay yours, {rider.displayName}.</h1>
      <p className="auth-intro">Choose how you want to appear around Lakbay. You can change this anytime from your Profile.</p>

      <div className="profile-avatar" style={{margin:'18px auto 22px'}}><ProfileAvatar profile={preview}/></div>

      <fieldset className="avatar-editor">
        <legend>Choose your avatar</legend>
        <p className="subtle">This identity is also used for your location marker while riding.</p>
        <div className="avatar-choices">
          <button type="button" aria-pressed={avatar==='rider'} onClick={()=>setAvatar('rider')}><UserRound/><span>Rider</span></button>
          <button type="button" aria-pressed={avatar==='bike'} onClick={()=>setAvatar('bike')}><Bike/><span>Motorcycle</span></button>
          <button type="button" aria-pressed={avatar==='arrow'} onClick={()=>setAvatar('arrow')}><Navigation/><span>Navigator</span></button>
          <button type="button" aria-pressed={avatar==='photo'} disabled={!photoVersion} onClick={()=>setAvatar('photo')}>{photoVersion?<ProfileAvatar profile={{...preview,mapAvatar:'photo'}}/>:<Camera/>}<span>My photo</span></button>
        </div>

        <label className="field-label">{uploading?'Preparing your photo…':'Upload a profile photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading||saving} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void uploadPhoto(file);}}/>
        </label>
        <p className="subtle">We crop your photo to a square and keep it private to your Lakbay account.</p>
      </fieldset>

      <label className="field-label">Account email<input value={email} readOnly type="email"/></label>
      {error&&<p className="inline-error" role="alert">{error}</p>}
      {message&&<p className="profile-saved" role="status"><Check size={16}/>{message}</p>}
      <button className="dark-button auth-submit" disabled={saving||uploading} onClick={()=>void finish(true)}>{saving?'Opening Lakbay…':'Use this avatar'}</button>
      <button className="text-button auth-forgot" type="button" disabled={saving||uploading} onClick={()=>void finish(false)}>Skip for now</button>
    </section>
    <p className="auth-footer">Your road. Your ride. Your Lakbay.</p>
  </div>;
}
