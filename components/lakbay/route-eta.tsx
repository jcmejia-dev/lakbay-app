import {routeEta} from '@/lib/eta';
import {distanceLabel,type RoadRoute} from '@/lib/navigation';
export default function RouteEta({route,remaining,now,stale}:{route:RoadRoute;remaining:number;now:number;stale:boolean}) {
  const eta=routeEta(route,remaining,now);
  if(!eta)return <p className="route-eta">ETA unavailable</p>;
  return <p className="route-eta"><span>{distanceLabel(eta.distance)}</span><span>~{Math.ceil(eta.seconds/60)} min</span><span>ETA {new Date(eta.arrival).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</span>{stale&&<small>GPS stale · estimate</small>}</p>;
}
