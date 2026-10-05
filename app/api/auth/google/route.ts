
const config=()=>process.env;

function redirectWithCookie(url:string,cookie:string){
  const headers=new Headers({Location:url});
  headers.append('Set-Cookie',cookie);
  return new Response(null,{status:303,headers});
}

function unavailable(req:Request){
  return Response.redirect(new URL('/?auth_error=google_setup',req.url),303);
}

export async function GET(req:Request){
  const c=config();
  if(!c.GOOGLE_CLIENT_ID||!c.GOOGLE_CLIENT_SECRET||!c.AUTH_SESSION_SECRET)return unavailable(req);

  let appOrigin:string;
  try{
    appOrigin=c.APP_BASE_URL?new URL(c.APP_BASE_URL).origin:new URL(req.url).origin;
  }catch{
    return unavailable(req);
  }

  const state=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id',c.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri',new URL('/api/auth/google/callback',appOrigin).toString());
  url.searchParams.set('response_type','code');
  url.searchParams.set('scope','openid email profile');
  url.searchParams.set('state',state);
  url.searchParams.set('prompt','select_account');

  return redirectWithCookie(
    url.toString(),
    `lakbay_google_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=300`,
  );
}
