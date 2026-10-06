import type {RideyContext} from './context';
export type RideyAction={type:'route'|'destination'|'weather'|'maintenance'|'stop';label:string;stopId?:string};
// Actions come from known app data, never provider-generated URLs or mutations.
export function contextualActions(message:string,context:RideyContext):RideyAction[]{
  const actions:RideyAction[]=[];
  if(context.route?.destination)actions.push({type:'destination',label:'View destination'});
  if(context.route?.distanceKm!==null&&context.route)actions.push({type:'route',label:'View route'});
  if(context.weather)actions.push({type:'weather',label:'View weather'});
  if(/maintenance|break.?down|repair|prepare|bring|long ride/.test(message.toLowerCase()))actions.push({type:'maintenance',label:'Open maintenance'});
  for(const stop of context.stops?.slice(0,2)||[])actions.push({type:'stop',label:`View ${stop.name}`,stopId:stop.id});
  return actions.slice(0,5);
}
