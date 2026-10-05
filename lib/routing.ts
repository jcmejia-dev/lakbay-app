import {z} from 'zod';
import {route as routeSchema} from './record-schemas';
import type {RoadRoute} from './navigation';
const coordinate=z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)]);
const geometry=z.object({coordinates:z.array(coordinate).min(1).max(25000)});
const step=z.object({name:z.string().max(180).default(''),ref:z.string().max(40).optional(),distance:z.number().nonnegative(),duration:z.number().nonnegative(),maneuver:z.object({type:z.string().max(40),modifier:z.string().max(40).optional(),exit:z.number().optional(),location:coordinate}),geometry});
const response=z.object({code:z.literal('Ok'),routes:z.array(z.object({distance:z.number().nonnegative(),duration:z.number().nonnegative(),geometry,legs:z.array(z.object({steps:z.array(step)}))})).min(1),waypoints:z.array(z.object({location:coordinate,distance:z.number().nonnegative()})).max(2)});
export function osrmAlternatives(raw:unknown):RoadRoute[] {
  const data=response.parse(raw),seen=new Set<string>();
  return data.routes.slice(0,3).flatMap(r=>{const signature=JSON.stringify(r.geometry.coordinates);if(seen.has(signature))return [];seen.add(signature);return [routeSchema.parse({distance:r.distance,duration:r.duration,coordinates:r.geometry.coordinates,steps:r.legs.flatMap(l=>l.steps).map(s=>({...s,geometry:s.geometry.coordinates})),snaps:data.waypoints,createdAt:Date.now()})];});
}
export function readRouteChoices(raw:unknown):RoadRoute[] {
  const data=raw as {alternatives?:unknown};
  const options=Array.isArray(data?.alternatives)?data.alternatives:[raw];
  const seen=new Set<string>();
  return options.slice(0,3).map(r=>routeSchema.parse(r)).filter(r=>{const signature=JSON.stringify(r.coordinates);if(seen.has(signature))return false;seen.add(signature);return true;});
}
