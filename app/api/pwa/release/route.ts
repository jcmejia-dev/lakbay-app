export const dynamic='force-dynamic';
import {release} from '@/lib/pwa/release';
export async function GET(){return Response.json(release,{headers:{'Cache-Control':'no-store'}});}
