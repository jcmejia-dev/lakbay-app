import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Storage unavailable');return env.DB;}
export function avatars(){const bucket=(env as unknown as {AVATARS:R2Bucket}).AVATARS;if(!bucket)throw Error('Photo storage unavailable');return bucket;}
