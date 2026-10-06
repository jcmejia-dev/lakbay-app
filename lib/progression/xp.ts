import type {Ride} from '../ride';
import {XP} from './config';
export function rideXp(ride:Ride){
  if(ride.status!=='complete'||ride.distance<.01||ride.seconds<=0)return 0;
  // Finite capped bonuses; rides longer than two hours need a recorded pause.
  const paused=ride.points.slice(1).some(p=>p.break);
  const bonus=ride.seconds>XP.longRideSeconds&&!paused?0:Math.floor(Math.min(ride.distance,XP.distanceCapKm)/XP.distanceStepKm)*XP.distanceStep;
  return XP.ride+bonus;
}
export function rideDay(started:number){return new Date(started).toLocaleDateString('en-CA',{timeZone:'Asia/Manila'});}
export function previousDay(day:string){return new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10);}
export function destinationKey(ride:Ride){return ride.destination?`${ride.destination.lat.toFixed(2)},${ride.destination.lng.toFixed(2)}`:null;}
