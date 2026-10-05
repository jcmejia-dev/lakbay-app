import {database} from '@/lib/storage';
import {getAccountIdentityFromRequest} from '@/lib/account-auth';
export async function getRider(owner:string){const row=await database().prepare("SELECT data FROM records WHERE owner=? AND id='rider' AND kind='rider'").bind(owner).first<{data:string}>();return row?JSON.parse(row.data):null;}
export async function riderAccess(req:Request){const identity=await getAccountIdentityFromRequest(req);if(!identity)return Response.json({error:'Please sign in to use Lakbay.'},{status:401});if(!await getRider(identity.id))return Response.json({error:'Complete your rider registration to continue.'},{status:403});return null;}
