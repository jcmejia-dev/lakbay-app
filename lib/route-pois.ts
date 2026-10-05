import {meters, type Location, type Poi, type RoadRoute} from './navigation';

// Projection onto the existing road geometry: an approximation, never a detour route.
export function projectRoute(route:RoadRoute, point:Location) {
  let offset=Infinity,along=0,total=0;
  for(let i=1;i<route.coordinates.length;i++) {
    const [ax,ay]=route.coordinates[i-1],[bx,by]=route.coordinates[i];
    const scale=Math.cos(point.lat*Math.PI/180),x=(ax-point.lng)*scale,y=ay-point.lat,dx=(bx-ax)*scale,dy=by-ay;
    const ratio=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
    const length=meters({lat:ay,lng:ax},{lat:by,lng:bx}),distance=Math.hypot(x+ratio*dx,y+ratio*dy)*111195;
    if(distance<offset){offset=distance;along=total+ratio*length;}
    total+=length;
  }
  return {offset,along,total};
}
const projections=new WeakMap<RoadRoute,Map<string,ReturnType<typeof projectRoute>>>();
function projectPoi(route:RoadRoute,poi:Poi){let cache=projections.get(route);if(!cache){cache=new Map();projections.set(route,cache);}const key=`${poi.id}:${poi.lat}:${poi.lng}`;let value=cache.get(key);if(!value){value=projectRoute(route,poi);cache.set(key,value);if(cache.size>1000)cache.delete(cache.keys().next().value!);}return value;}
export function recommendFuel(route:RoadRoute, pois:Poi[], position:Location, rangeKm:number) {
  const rider=projectRoute(route,position);
  return pois.filter(p=>p.type==='fuel').map(p=>({...p,...projectPoi(route,p)}))
    .filter(p=>p.offset<=1500&&p.along>=rider.along-100&&p.along-rider.along+p.offset<=rangeKm*1000)
    .sort((a,b)=>a.offset-b.offset||a.along-b.along).slice(0,3);
}
export function visiblePois(pois:Poi[],route:RoadRoute|null|undefined,position:Location,zoom:number,running:boolean,highlighted:string[]=[]) {
  const rider=route?projectRoute(route,position):null;
  const candidates=pois.map(p=>({p,projection:route?projectPoi(route,p):null,distance:meters(position,p)}))
    .filter(({p,projection})=>highlighted.includes(p.id)||(!running||!projection||(projection.offset<800&&projection.along>=(rider?.along||0)-150)))
    .sort((a,b)=>Number(highlighted.includes(b.p.id))-Number(highlighted.includes(a.p.id))||(running?Number(a.p.type==='shop')-Number(b.p.type==='shop'):0)||a.distance-b.distance);
  const max=zoom<11?0:zoom<13?4:running?8:zoom<15?10:18;
  const chosen:Poi[]=[];
  for(const {p} of candidates){if(chosen.length>=max&&!highlighted.includes(p.id))continue;if(highlighted.includes(p.id)||!chosen.some(other=>meters(p,other)<(zoom<14?350:80)))chosen.push(p);}
  return chosen;
}
