export type RiderProfile={displayName:string;homeTown:string;joinedAt:string;mapAvatar?:'arrow'|'rider'|'bike'|'photo';photoVersion?:string;onboardingComplete?:boolean};
export function avatarUrl(profile:RiderProfile){return profile.photoVersion?'/api/avatar?v='+encodeURIComponent(profile.photoVersion):null;}
export function profileInitials(name:string){return name.trim().split(/\s+/).filter(Boolean).map(part=>part[0]).slice(0,2).join('').toUpperCase()||'R';}
