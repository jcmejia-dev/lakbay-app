import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function launch(visibility='visible'){
  const state=[],listeners=new Map(),timers=new Map();let effect,index=0,next=0;
  const document={visibilityState:visibility,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
  const window={matchMedia:()=>({matches:false}),setTimeout:(f,ms)=>{timers.set(++next,{f,ms});return next;},clearTimeout:id=>timers.delete(id),addEventListener(){},removeEventListener(){}};
  const exports={};const source=ts.transpileModule(fs.readFileSync(new URL('../components/lakbay/splash.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(source,{exports,document,window,require:name=>name==='react'?{useState:value=>{const i=index++;state[i]=value;return [value,v=>state[i]=v];},useEffect:f=>effect=f}:name==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'}:{playLakbayReveal:()=>true}});
  const tree=exports.default({children:'app'});
  return {state,tree,timers,start:()=>effect(),visibility:value=>{document.visibilityState=value;listeners.get('visibilitychange')?.();},finish:()=>{for(const timer of [...timers.values()].sort((a,b)=>a.ms-b.ms))timer.f();timers.clear();}};
}
test('cold launch renders the full brand before hydration without device storage',()=>{
 const h=launch();assert.equal(h.state[0],'brand');assert.equal(h.tree.props.children[1].props.className,'lakbay-splash');assert.equal(h.tree.props.children[1].props['data-playing'],false);
 const word=h.tree.props.children[1].props.children.props.children[1].props.children;
 assert.equal(word.props.children[0],'lakbay');
});
test('hidden launch defers its full reveal until visible and restarts an interrupted reveal',()=>{
 const h=launch('hidden');h.start();assert.equal(h.timers.size,0);h.visibility('visible');assert.equal(h.timers.size,2);assert.equal(h.state[1],true);
 h.visibility('hidden');assert.equal(h.timers.size,0);assert.equal(h.state[1],false);h.visibility('visible');assert.equal(h.timers.size,2);
});
test('a completed launch does not cover an active ride when returning from another app',()=>{
 const h=launch();const cleanup=h.start();h.finish();assert.equal(h.state[0],'ready');h.visibility('hidden');h.visibility('visible');assert.equal(h.state[0],'ready');assert.equal(h.timers.size,0);cleanup();
});
