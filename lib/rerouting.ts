import type {Point} from './ride';
export class RerouteGate {
  private since=0;private lastAttempt=-Infinity;private sample=0;private samples=0;
  reset(){this.since=0;this.samples=0;this.sample=0;this.lastAttempt=-Infinity;}
  markAttempt(now:number){this.lastAttempt=now;this.since=0;this.samples=0;}
  check(position:Point,offset:number,now:number,busy:boolean){
    if(busy||now-this.lastAttempt<45000)return false;
    if(position.accuracy===undefined||position.accuracy>35||now-position.t>15000||now<position.t||offset<=180){this.since=0;this.samples=0;return false;}
    if(!this.samples){this.since=now;this.samples=1;this.sample=position.t;}
    else if(this.sample!==position.t){this.sample=position.t;this.samples++;}
    if(this.samples>=2&&now-this.since>=8000){this.lastAttempt=now;this.since=0;this.samples=0;return true;}
    return false;
  }
}
