export type Vehicle = {id:string; name:string; type:'motorcycle'|'car'; kmPerLiter:number; tankLiters?:number; notes?:string};
export type Garage = {vehicles:Vehicle[]; activeVehicleId?:string};
export function fuelEstimate(liters:number, economy:number, distanceKm:number, tankLiters?:number) {
  if (![liters,economy,distanceKm].every(Number.isFinite) || liters<0 || economy<=0 || distanceKm<0 || (tankLiters!==undefined&&liters>tankLiters)) return null;
  const needed=distanceKm/economy, remaining=liters-needed, reserve=Math.max(.5,needed*.15);
  return {range:liters*economy, needed, remaining, reserve, status:remaining<0?'Insufficient estimated fuel':remaining<reserve?'Refuel recommended':remaining<reserve*2?'Fuel may be low':'Enough fuel'};
}
