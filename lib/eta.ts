import type {RoadRoute} from './navigation';
// Duration estimates come from the selected route, not straight-line speed guesses.
export function routeEta(route:RoadRoute,remainingMeters:number,now:number) {
  if(!Number.isFinite(route.duration)||route.duration<0||!Number.isFinite(route.distance)||route.distance<0||!Number.isFinite(now)||!Number.isFinite(remainingMeters))return null;
  const ratio=route.distance>0?Math.max(0,Math.min(1,remainingMeters/route.distance)):0;
  const seconds=route.duration*ratio;
  return {distance:Math.max(0,remainingMeters),seconds,arrival:Math.round((now+seconds*1000)/60000)*60000};
}
export function fastestRouteIndex(routes:RoadRoute[]) {
  if(routes.length<2||routes.some(r=>!Number.isFinite(r.duration)||r.duration<0))return null;
  return routes.reduce((best,r,i)=>r.duration<routes[best].duration?i:best,0);
}
