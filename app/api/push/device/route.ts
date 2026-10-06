import {notificationAccess} from '@/lib/notifications/access';
import {deviceRequest,deviceStatus} from '@/lib/notifications/device';
import {z} from 'zod';
export async function POST(req:Request){
 try{const owner=await notificationAccess(req,true);if(owner instanceof Response)return owner;
 const raw=await req.text();if(raw.length>3000)return Response.json({error:'Request too large.'},{status:413});
 const {endpoint}=deviceRequest.parse(JSON.parse(raw));return Response.json(await deviceStatus(owner,endpoint),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:'Could not check this device.'},{status:error instanceof z.ZodError||error instanceof SyntaxError?400:503});}
}
