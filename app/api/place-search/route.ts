import {riderAccess} from '@/lib/rider';
import {remote} from '@/lib/explore';

const MAX_QUERY=400;

function coordinate(value:string|null,min:number,max:number){
  const n=Number(value);
  if(value===null||value.trim()===''||!Number.isFinite(n)||n<min||n>max)throw Error('Invalid coordinates');
  return n;
}

function photoUrl(name?:string){return name?`/api/place-photo?name=${encodeURIComponent(name)}`:undefined;}

async function googleSearch(q:string,lat:number,lng:number){
  const key=process.env.GOOGLE_PLACES_API_KEY;
  if(!key)return null;
  const response=await remote('https://places.googleapis.com/v1/places:searchText',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Goog-Api-Key':key,
      'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.userRatingCount,places.primaryTypeDisplayName'
    },
    body:JSON.stringify({
      textQuery:q,
      languageCode:'en',
      regionCode:'PH',
      maxResultCount:10,
      locationBias:{circle:{center:{latitude:lat,longitude:lng},radius:50000}}
    })
  },12000);
  return {source:'Google Places',places:(response.places||[]).map((place:any)=>({
    id:place.id,
    lat:place.location?.latitude,
    lng:place.location?.longitude,
    name:place.displayName?.text||q,
    label:place.formattedAddress||'',
    photoUrl:photoUrl(place.photos?.[0]?.name),
    rating:place.rating,
    ratingCount:place.userRatingCount,
    placeType:place.primaryTypeDisplayName?.text,
    provider:'google'
  })).filter((place:any)=>Number.isFinite(place.lat)&&Number.isFinite(place.lng))};
}

async function photonSearch(q:string,lat:number,lng:number){
  const url='https://photon.komoot.io/api/?'+new URLSearchParams({q,limit:'10',lat:lat.toFixed(2),lon:lng.toFixed(2),lang:'en'});
  const j=await remote(url,{},12000);
  return {source:'OpenStreetMap / Photon',places:(j.features||[]).map((f:any)=>({
    id:`osm-${f.properties.osm_type||'place'}-${f.properties.osm_id}`,
    lat:f.geometry.coordinates[1],
    lng:f.geometry.coordinates[0],
    name:f.properties.name||f.properties.street||q,
    label:[f.properties.name,f.properties.housenumber&&f.properties.street?`${f.properties.housenumber} ${f.properties.street}`:f.properties.street,f.properties.city||f.properties.district,f.properties.state,f.properties.postcode,f.properties.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(', '),
    provider:'osm'
  }))};
}

export async function GET(req:Request){
  try{const denied=await riderAccess(req);if(denied)return denied;}catch{return Response.json({error:'Account unavailable.'},{status:503});}
  try{
    const p=new URL(req.url).searchParams;
    const q=(p.get('q')||'').trim();
    if(q.length<2||q.length>MAX_QUERY)return Response.json({error:`Enter a destination with 2–${MAX_QUERY} characters.`},{status:400});
    const lat=coordinate(p.get('lat'),-85,85),lng=coordinate(p.get('lng'),-180,180);
    try{
      const google=await googleSearch(q,lat,lng);
      if(google?.places.length)return Response.json(google,{headers:{'Cache-Control':'private, max-age=60'}});
    }catch(error){console.warn('Google Places search fallback:',error instanceof Error?error.message:error);}
    const osm=await photonSearch(q,lat,lng);
    return Response.json(osm,{headers:{'Cache-Control':'private, max-age=60'}});
  }catch(error){
    console.error('Place search:',error);
    return Response.json({error:error instanceof Error?error.message:'Place search unavailable.'},{status:503});
  }
}
