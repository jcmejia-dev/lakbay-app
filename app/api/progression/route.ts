import {riderAccess} from '@/lib/rider';
import {getAccountIdentityFromRequest} from '@/lib/account-auth';
import {transaction} from '@/lib/storage';
import {reconcileProgression} from '@/lib/progression/repository';
import {claimUnlocks} from '@/lib/progression/ledger';
export const runtime='nodejs';
async function access(req:Request){const denied=await riderAccess(req);if(denied)return denied;return (await getAccountIdentityFromRequest(req))!.id;}
export async function GET(req:Request){
  try{const owner=await access(req);if(owner instanceof Response)return owner;const progression=await transaction(owner,db=>reconcileProgression(db,owner));return Response.json({progression},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'Progression is temporarily unavailable. Your rides are still saved.'},{status:503});}
}
export async function POST(req:Request){
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
  try{const owner=await access(req);if(owner instanceof Response)return owner;const unlocks=await transaction(owner,db=>claimUnlocks(db,owner));return Response.json({unlocks},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'Unlock notifications unavailable.'},{status:503});}
}
