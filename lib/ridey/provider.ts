// Server-only dependency makes accidental inclusion in a client bundle fail.
import {randomUUID} from 'node:crypto';
export type ChatMessage={role:'user'|'assistant';content:string};
export type Provider={complete:(system:string,messages:ChatMessage[],signal:AbortSignal)=>Promise<string>};
export class ProviderError extends Error {constructor(){super('Ridey could not reach the AI service. Please retry.');}}
export class UnconfiguredError extends Error {constructor(){super('Ridey is not configured yet. Your map and ride tools are ready to use.');}}
export type ProviderConfig={provider?:string;baseUrl?:string;model?:string;apiKey?:string};
export function providerConfig():ProviderConfig{return {provider:process.env.RIDEY_PROVIDER,baseUrl:process.env.RIDEY_BASE_URL,model:process.env.RIDEY_MODEL,apiKey:process.env.RIDEY_API_KEY};}
export function providerReady(config=providerConfig()){
  try{const url=new URL(config.baseUrl||'');return ['openai-compatible','ollama'].includes(config.provider||'')&&!!config.model&&['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&!url.hash;}catch{return false;}
}
export function createProvider(config=providerConfig(),fetcher:typeof fetch=fetch):Provider{
  if(!providerReady(config))throw new UnconfiguredError();
  const base=config.baseUrl!.replace(/\/$/,''),model=config.model!;
  return {async complete(system,messages,signal){
    try{
      const response=await fetcher(base+(config.provider==='ollama'?'/api/chat':'/chat/completions'),{
        method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json',...(config.apiKey?{Authorization:`Bearer ${config.apiKey}`}:{})},
        body:JSON.stringify({model,messages:[{role:'system',content:system},...messages],stream:false,...(config.provider==='ollama'?{options:{num_predict:700,temperature:.3}}:{max_tokens:700,temperature:.3})}),
      });
      if(!response.ok)throw new ProviderError();
      const raw=await response.text();if(raw.length>100000)throw new ProviderError();
      const data=JSON.parse(raw) as {message?:{content?:unknown};choices?:Array<{message?:{content?:unknown}}>};
      const content=config.provider==='ollama'?data.message?.content:data.choices?.[0]?.message?.content;
      if(typeof content!=='string'||!content.trim())throw new ProviderError();
      return content.trim().slice(0,6000);
    }catch{throw new ProviderError();}
  }};
}
export function requestId(){return randomUUID();}
