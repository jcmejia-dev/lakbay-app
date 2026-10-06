import type {RiderStats} from './achievements';
export type Unlock={key:string;type:'achievement'|'tier';name:string;detail:string;xp:number;at:number};
export type Progression={version:1;totalXp:number;stats:RiderStats;achievements:string[];tiers:string[]};
export const emptyProgression=():Progression=>({version:1,totalXp:0,stats:{rides:0,distanceKm:0,destinations:0,weekend:false,early:false,night:false,maintenance:0,prepared:false},achievements:[],tiers:['Bronze']});
