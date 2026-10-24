import {riderAccess} from '@/lib/rider';

export async function GET(req:Request){
  try{const denied=await riderAccess(req);if(denied)return denied;}catch{return new Response('Account unavailable.',{status:503});}
  const key=process.env.GOOGLE_PLACES_API_KEY;
  if(!key)return new Response('Place photos unavailable.',{status:503});
  const name=new URL(req.url).searchParams.get('name')||'';
  if(!/^places\/[A-Za-z0-9._-]+\/photos\/[A-Za-z0-9._-]+$/.test(name))return new Response('Invalid photo.',{status:400});
  try{
    const url=`https://places.googleapis.com/v1/${name}/media?maxWidthPx=720&maxHeightPx=480&skipHttpRedirect=true`;
    const meta=await fetch(url,{headers:{'X-Goog-Api-Key':key},signal:AbortSignal.timeout(10000)});
    if(!meta.ok)return new Response('Photo unavailable.',{status:404});
    const data=await meta.json() as {photoUri?:string};
    if(!data.photoUri)return new Response('Photo unavailable.',{status:404});
    const image=await fetch(data.photoUri,{signal:AbortSignal.timeout(10000)});
    if(!image.ok||!image.body)return new Response('Photo unavailable.',{status:404});
    return new Response(image.body,{headers:{'Content-Type':image.headers.get('content-type')||'image/jpeg','Cache-Control':'public, max-age=86400, stale-while-revalidate=604800'}});
  }catch{return new Response('Photo unavailable.',{status:503});}
}
