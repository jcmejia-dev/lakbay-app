import {z} from 'zod';
import {getAccountIdentityFromRequest} from '@/lib/account-auth';
import {riderAccess} from '@/lib/rider';
import {contextSchema,minimumContext} from '@/lib/ridey/context';
import {providerReady,createProvider,UnconfiguredError,requestId} from '@/lib/ridey/provider';
import {rideySystem} from '@/lib/ridey/prompt';
import {contextualActions} from '@/lib/ridey/actions';
import {allowRideyRequest} from '@/lib/ridey/rate-limit';
export const runtime='nodejs';
export const maxDuration=30;
const message=z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(2000)}).strict();
const requestSchema=z.object({messages:z.array(message).min(1).max(12),context:contextSchema.optional()}).strict().refine(v=>v.messages.at(-1)?.role==='user',{message:'A user message is required.'});
export async function GET(req:Request){
  try{const denied=await riderAccess(req);if(denied)return denied;return Response.json({available:providerReady(),message:providerReady()?'Ridey is ready.':'Ridey is not configured yet. Your map and ride tools are ready to use.'},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({available:false,message:'Ridey is temporarily unavailable.'},{status:503});}
}
export async function POST(req:Request){
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
  try{
    const denied=await riderAccess(req);if(denied)return denied;
    const owner=(await getAccountIdentityFromRequest(req))!.id;
    const raw=await req.text();if(raw.length>32000)return Response.json({error:'Keep your message short.'},{status:413});
    const input=requestSchema.parse(JSON.parse(raw));
    if(!providerReady())throw new UnconfiguredError();
    if(!await allowRideyRequest(owner))return Response.json({error:'Ridey has reached the shared usage limit. Please try again later.'},{status:429,headers:{'Retry-After':'60'}});
    const latest=input.messages.at(-1)!.content;
    // Follow-up questions may need context from the preceding conversation.
    const topics=input.messages.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join(' ');
    const context=minimumContext(topics,input.context||{});
    const content=await createProvider().complete(rideySystem(context),input.messages,AbortSignal.any([req.signal,AbortSignal.timeout(20000)]));
    return Response.json({id:requestId(),content,actions:contextualActions(latest,context),source:'AI suggestion',contextUsed:Object.keys(context)},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof UnconfiguredError)return Response.json({error:error.message,code:'unconfigured'},{status:503});
    if(error instanceof z.ZodError||error instanceof SyntaxError)return Response.json({error:'Please check your message and ride context.'},{status:400});
    // Never return provider response bodies, endpoint details or credentials.
    return Response.json({error:'Ridey could not respond. Please retry. Your ride tools are still available.'},{status:503});
  }
}
