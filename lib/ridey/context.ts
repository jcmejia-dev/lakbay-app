import {z} from 'zod';
import type {Location,RoadRoute,Poi} from '../navigation';
import type {Vehicle} from '../fuel';
import type {Weather} from '../weather';
import {forecastAt,weatherName} from '../weather';
import {fuelEstimate} from '../fuel';
const amount=z.number().finite().min(0).max(1000000).nullable();
const weatherSummary=z.object({condition:z.string().max(40),temperatureC:z.number().min(-80).max(70).nullable(),rainChancePercent:z.number().min(0).max(100).nullable(),windKph:amount,fetchedAt:z.number().finite()}).strict();
export const contextSchema=z.object({
  route:z.object({destination:z.string().max(140).nullable(),distanceKm:amount,remainingKm:amount,etaMinutes:amount,estimate:z.literal(true)}).strict().optional(),
  weather:z.object({current:weatherSummary.nullable(),destination:weatherSummary.nullable()}).strict().optional(),
  fuel:z.object({vehicleType:z.enum(['motorcycle','car']),kmPerLiter:z.number().min(.1).max(200),estimatedLiters:amount,requiredLiters:amount,rangeKm:amount,status:z.string().max(80).nullable(),estimate:z.literal(true)}).strict().optional(),
  stops:z.array(z.object({id:z.string().max(100),name:z.string().max(140),type:z.enum(['fuel','shop']),availability:z.literal('unverified')}).strict()).max(5).optional(),
  history:z.object({completedRides:z.number().int().min(0),distanceKm:amount}).strict().optional(),
  maintenance:z.array(z.object({name:z.string().max(100),remainingKm:z.number().finite().min(-10000000).max(10000000)}).strict()).max(5).optional(),
}).strict();
export type RideyContext=z.infer<typeof contextSchema>;
export type RideySnapshot={destination:Location|null;route:RoadRoute|null;remainingKm:number;etaMinutes:number|null;weather:Weather|null;vehicle:Vehicle|undefined;estimatedLiters:number|null;pois:Array<Pick<Poi,'id'|'name'|'type'>>};
export function buildRideyContext(input:RideySnapshot):RideyContext{
  const summarize=(index:number)=>{
    const point=input.weather?.weather[index];if(!point||!input.weather)return null;
    const forecast=index===1?forecastAt(point,Date.now()+(input.etaMinutes||0)*60000):null;
    return {condition:weatherName(forecast?forecast.code:point.current.weather_code),temperatureC:forecast?forecast.temperature:point.current.temperature_2m,rainChancePercent:forecast?.rain??null,windKph:forecast?forecast.wind:point.current.wind_speed_10m,fetchedAt:input.weather.fetchedAt};
  };
  const fuel=input.vehicle&&input.estimatedLiters!==null?fuelEstimate(input.estimatedLiters,input.vehicle.kmPerLiter,input.remainingKm,input.vehicle.tankLiters):null;
  return {
    route:{destination:input.destination?.name||null,distanceKm:input.route?input.route.distance/1000:null,remainingKm:input.route?input.remainingKm:null,etaMinutes:input.etaMinutes,estimate:true},
    weather:{current:summarize(0),destination:input.destination?summarize(1):null},
    ...(input.vehicle?{fuel:{vehicleType:input.vehicle.type,kmPerLiter:input.vehicle.kmPerLiter,estimatedLiters:input.estimatedLiters,requiredLiters:fuel?.needed??null,rangeKm:fuel?.range??null,status:fuel?.status??null,estimate:true as const}}:{}),
    stops:input.pois.slice(0,5).map(p=>({id:p.id,name:p.name,type:p.type,availability:'unverified' as const})),
  };
}
// Same whitelist runs in the UI and server. No coordinates, names, email, GPS
// tracks, vehicle notes, raw ride history or profile photos enter the AI prompt.
export function minimumContext(message:string,context:RideyContext):RideyContext{
  const text=message.toLowerCase(),out:RideyContext={};
  const fuel=/fuel|gas|petrol|range|lit(er|re)/.test(text),weather=/rain|weather|wind|storm/.test(text),breakdown=/break.?down|repair|mechanic|engine|tire|tyre|chain|battery/.test(text),prepare=/bring|prepare|checklist|long ride|trip|route/.test(text),explore=/suggest|destination|somewhere|explor/.test(text);
  if(fuel||weather||prepare||explore)out.route=context.route;
  if(weather||prepare)out.weather=context.weather;
  if(fuel||prepare)out.fuel=context.fuel;
  if(fuel||breakdown)out.stops=context.stops?.filter(p=>p.type===(fuel?'fuel':'shop')).slice(0,3);
  if(breakdown||prepare)out.maintenance=context.maintenance;
  if(/history|rides|distance|progress/.test(text))out.history=context.history;
  return out;
}
