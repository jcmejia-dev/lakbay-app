import {getAccountIdentityFromRequest} from '@/lib/account-auth';
export async function GET(req:Request){const user=await getAccountIdentityFromRequest(req);return Response.json({user:user?{name:user.name,email:user.email,cacheKey:user.id,provider:user.provider}:null},{headers:{'Cache-Control':'no-store'}});}
