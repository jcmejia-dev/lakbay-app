'use client';
import {Shield,Trophy,Check} from 'lucide-react';
import type {CSSProperties} from 'react';
import {Progress} from '@/components/ui/progress';
import {levelProgress,tierForXp} from '@/lib/progression/levels';
import {ACHIEVEMENTS} from '@/lib/progression/achievements';
import type {Progression} from '@/lib/progression/types';
export function ProgressionCard({progression,error,onRetry}:{progression:Progression|null;error?:string;onRetry?:()=>void}){
  if(!progression)return <section className="card progression-card"><h2>Rider progression</h2><p className="subtle">{error||'Loading your rider milestones…'}</p>{error&&<button className="small-button" onClick={onRetry}>Retry</button>}</section>;
  const p=levelProgress(progression.totalXp),tier=tierForXp(p.totalXp);
  return <section className="card progression-card"><div className="progression-heading"><span className="tier-emblem" style={{'--tier-color':tier.color} as CSSProperties} aria-label={`${tier.name} badge`}><Shield size={28}/></span><div><p className="eyebrow">{tier.name.toUpperCase()} RIDER</p><h2>Level {p.level}</h2></div><span className="xp-total">{p.totalXp.toLocaleString()} XP total</span></div><Progress value={p.percent} aria-label="Progress toward next rider level"/><div className="xp-caption"><span>{p.currentXp} / {p.nextLevelXp} XP this level</span><span>{p.xpNeeded} XP to level {p.level+1}</span></div><p className="subtle">Safe rides, preparation and care count. Speed never earns XP.</p>{error&&<p role="status" className="subtle">{error} <button onClick={onRetry}>Retry</button></p>}</section>;
}
export function AchievementGrid({progression,compact=false}:{progression:Progression|null;compact?:boolean}){
  if(!progression)return null;
  const achievements=compact?ACHIEVEMENTS.filter(a=>progression.achievements.includes(a.id)).slice(-3):ACHIEVEMENTS;
  return <section aria-label={compact?'Selected achievements':'Rider achievements'}>{compact&&<h2 className="selected-achievements-heading">Your achievements</h2>}<div className={compact?'selected-achievements':'badge-grid'}>{achievements.map(a=>{
    const unlocked=progression.achievements.includes(a.id),value=Math.min(a.goal,a.value(progression.stats));
    return <article className={'card badge '+(unlocked?'earned':'')} key={a.id}><div className="badge-emblem">{unlocked?<Check size={compact?20:32}/>:<Trophy size={32}/>}</div><span className="badge-state">{unlocked?'UNLOCKED':'IN PROGRESS'}</span><h2>{a.name}</h2><p>{a.detail}</p>{!compact&&<><Progress value={unlocked?100:value/a.goal*100}/><small>{unlocked?'Completed':`${Math.floor(value)} / ${a.goal}`} · {a.xp} XP</small></>}</article>;
  })}</div>{compact&&!achievements.length&&<p className="subtle">Your first completed ride starts your achievement collection.</p>}</section>;
}
