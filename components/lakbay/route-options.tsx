import {fastestRouteIndex} from '@/lib/eta';
import {distanceLabel,type RoadRoute} from '@/lib/navigation';
export default function RouteOptions({routes,selected,onSelect}:{routes:RoadRoute[];selected:RoadRoute|null;onSelect:(index:number)=>void}) {
  if(routes.length<2)return null;
  const fastest=fastestRouteIndex(routes);
  return <div className="route-options" role="group" aria-label="Route alternatives">{routes.map((route,i)=><button key={i} className={route===selected?'selected':''} aria-pressed={route===selected} onClick={()=>onSelect(i)}><strong>Route {String.fromCharCode(65+i)}{fastest===i&&<span className="fastest-label">Fastest</span>}</strong><small>{Math.ceil(route.duration/60)} min · {distanceLabel(route.distance)}</small></button>)}</div>;
}
