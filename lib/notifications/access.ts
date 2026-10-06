import {riderAccess} from '../rider';
import {getAccountIdentityFromRequest} from '../account-auth';
export async function notificationAccess(req:Request,mutate=false){
  if(mutate&&req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
  if(mutate&&req.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Invalid origin.'},{status:403});
  const denied=await riderAccess(req);if(denied)return denied;const user=await getAccountIdentityFromRequest(req);return user?.id||Response.json({error:'Sign in to use notifications.'},{status:401});
}
