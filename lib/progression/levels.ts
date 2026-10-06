import {TIERS} from './config';
export function levelThreshold(level:number){return 100*(level-1)**2;}
export function levelProgress(totalXp:number){
  const xp=Math.max(0,Math.floor(Number.isFinite(totalXp)?totalXp:0));
  const level=Math.floor(Math.sqrt(xp/100))+1,base=levelThreshold(level),next=levelThreshold(level+1);
  return {level,totalXp:xp,currentXp:xp-base,nextLevelXp:next-base,xpNeeded:next-xp,percent:(xp-base)/(next-base)*100};
}
export function tierForXp(xp:number){return [...TIERS].reverse().find(t=>xp>=t.xp)||TIERS[0];}
