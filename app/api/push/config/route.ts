import {notificationAccess} from '@/lib/notifications/access';
import {vapidConfiguration} from '@/lib/notifications/push';
export async function GET(req:Request){try{const owner=await notificationAccess(req);if(owner instanceof Response)return owner;const config=vapidConfiguration();return Response.json({configured:!!config,publicKey:config?.publicKey||null},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({configured:false},{status:503});}}
