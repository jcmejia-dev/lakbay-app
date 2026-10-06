export const dynamic='force-dynamic';
import {release} from '@/lib/pwa/release';
import {workerSource} from '@/lib/pwa/worker-source';
export async function GET(){return new Response(workerSource(release.id),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store, max-age=0','Service-Worker-Allowed':'/'}});}
