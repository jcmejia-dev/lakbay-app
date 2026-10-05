import {meters,type Location} from './navigation';
import type {Point} from './ride';
export const ARRIVAL_RADIUS_METERS=60;
export function arrivalCandidate(position:Point,destination:Location,rideStarted:number,now=Date.now()) {
  return position.t>=rideStarted&&now-position.t>=0&&now-position.t<15000&&meters(position,destination)<=ARRIVAL_RADIUS_METERS;
}
export class ArrivalGate {
  private state:{id:string;since:number;last:number;samples:number;triggered:boolean}|null=null;
  check(ride:{id:string;started:number;distance:number},position:Point,destination:Location,now=Date.now()) {
    if(this.state?.id!==ride.id)this.state=null;
    if(this.state?.triggered)return false;
    if(!arrivalCandidate(position,destination,ride.started,now)||position.accuracy===undefined||position.accuracy>35||ride.distance<.01){this.state=null;return false;}
    if(!this.state||now-this.state.last>=15000)this.state={id:ride.id,since:now,last:position.t,samples:1,triggered:false};
    else if(this.state.last!==position.t){this.state.samples++;this.state.last=position.t;}
    if(this.state.samples>=2&&now-this.state.since>=4000){this.state.triggered=true;return true;}
    return false;
  }
  retry(){this.state=null;}
}
