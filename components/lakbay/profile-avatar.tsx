'use client';
import {useState} from 'react';
import {Bike,Navigation,UserRound} from 'lucide-react';
import {avatarUrl,profileInitials,type RiderProfile} from '@/lib/profile';

export function AvatarFallback({profile,marker=false}:{profile:RiderProfile;marker?:boolean}) {
  if(marker)return profile.mapAvatar==='bike'?<Bike size={23}/>:profile.mapAvatar==='rider'||profile.mapAvatar==='photo'?<UserRound size={23}/>:<Navigation size={23}/>;
  if(profile.mapAvatar==='bike')return <Bike size={28}/>;
  if(profile.mapAvatar==='rider')return <UserRound size={28}/>;
  if(profile.mapAvatar==='arrow')return <Navigation size={28}/>;
  return <span>{profileInitials(profile.displayName)}</span>;
}
export default function ProfileAvatar({profile,marker=false}:{profile:RiderProfile;marker?:boolean}) {
  const [failed,setFailed]=useState<string|null>(null),src=avatarUrl(profile);
  // The authenticated avatar endpoint serves private images directly, with versioned cache invalidation.
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="profile-avatar-content">{src&&failed!==src?<img src={src} alt={profile.displayName+' profile photo'} onError={()=>setFailed(src)}/>:<AvatarFallback profile={profile} marker={marker}/>}</span>;
}
export function UserMarker({profile}:{profile:RiderProfile}) {
  return <div className="rider-location-pin"><svg viewBox="0 0 48 64" aria-hidden="true"><path d="M24 2C12 2 2 12 2 24c0 16 22 37 22 37s22-21 22-37C46 12 36 2 24 2Z"/></svg><div className="rider-pin-face"><ProfileAvatar profile={profile} marker/></div></div>;
}
