export type Vehicle = {id:string; name:string; type:'motorcycle'|'car'; kmPerLiter:number; tankLiters?:number; fuelPricePerLiter?:number; notes?:string};
export type Garage = {vehicles:Vehicle[]; activeVehicleId?:string};
export function fuelEstimate(liters:number, economy:number, distanceKm:number, tankLiters?:number) {
  if (![liters,economy,distanceKm].every(Number.isFinite) || liters<0 || economy<=0 || distanceKm<0 || (tankLiters!==undefined&&liters>tankLiters)) return null;
  const needed=distanceKm/economy, remaining=liters-needed, reserve=Math.max(.5,needed*.15);
  return {range:liters*economy, needed, remaining, reserve, status:remaining<0?'Insufficient estimated fuel':remaining<reserve?'Refuel recommended':remaining<reserve*2?'Fuel may be low':'Enough fuel'};
}
export function rideFuelCost(distanceKm:number,economy:number,fuelPricePerLiter?:number){
  if(!Number.isFinite(distanceKm)||distanceKm<0||!Number.isFinite(economy)||economy<=0)return null;
  const litersUsed=distanceKm/economy;
  const fuelCost=fuelPricePerLiter!==undefined&&Number.isFinite(fuelPricePerLiter)&&fuelPricePerLiter>0?litersUsed*fuelPricePerLiter:null;
  return {litersUsed,fuelCost};
}

export function refuelTotal(current:number,amount:number,unit:'liters'|'pesos',price:number,tankLiters?:number){
  if(!Number.isFinite(current)||current<0||!Number.isFinite(amount)||amount<=0)return null;
  if(unit==='pesos'&&(!Number.isFinite(price)||price<=0))return null;
  const added=unit==='pesos'?amount/price:amount,total=current+added;
  if(!Number.isFinite(total)||(tankLiters!==undefined&&total>tankLiters))return null;
  return {added,total};
}
