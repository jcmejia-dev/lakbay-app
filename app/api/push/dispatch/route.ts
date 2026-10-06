import {backgroundSweep,cronAuthorized} from '@/lib/notifications/push';
export const maxDuration=60;
export async function GET(req:Request){if(!cronAuthorized(req))return Response.json({error:'Unauthorized.'},{status:401});try{return Response.json(await backgroundSweep(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Background delivery unavailable.'},{status:503});}}
export const POST=GET;
