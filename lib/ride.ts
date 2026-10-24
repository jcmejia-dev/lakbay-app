export type Point={lat:number;lng:number;t:number;accuracy?:number;break?:boolean};
export type RideEconomics={vehicleId:string;vehicleName:string;kmPerLiter:number;fuelPricePerLiter:number;litersUsed:number;fuelCost:number;recordedAt:number};
export type Ride={id:string;name:string;type:'commute'|'adventure';status:'active'|'complete';started:number;seconds:number;distance:number;points:Point[];destination?:{lat:number;lng:number;name?:string};arrivedAt?:number;rating?:number;feedback?:string;economics?:RideEconomics};
export function km(a:Point,b:Point){const rad=Math.PI/180;const dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
export function duration(s:number){return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor(s%3600/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;}
