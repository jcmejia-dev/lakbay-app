import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);const hash=createHash('sha256');
async function visit(path){for(const e of (await readdir(new URL(path+'/',root),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=path+'/'+e.name;if(p==='lib/pwa/generated-release.json')continue;if(e.isDirectory())await visit(p);else{hash.update(p+'\0');hash.update(await readFile(new URL(p,root)));}}}
for(const dir of ['app','components','lib','public'])await visit(dir);
for(const file of ['package.json','package-lock.json','next.config.ts','scripts/generate-release.mjs']){hash.update(file+'\0');hash.update(await readFile(new URL(file,root)));}
let seconds=Number(process.env.SOURCE_DATE_EPOCH);if(!seconds){try{seconds=Number(execFileSync('git',['log','-1','--format=%ct'],{cwd:root,encoding:'utf8'}).trim());}catch{seconds=Math.floor(Date.now()/1000);}}
let commit=process.env.VERCEL_GIT_COMMIT_SHA||'';if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}}
const release={commit,id:hash.digest('hex').slice(0,24),time:seconds*1000,title:'Lakbay updated — Ridey & notifications',summary:'XP, achievements, Ridey, background phone alerts and safer app updates are ready.'};
await mkdir(new URL('lib/pwa/',root),{recursive:true});await writeFile(new URL('lib/pwa/generated-release.json',root),JSON.stringify(release,null,2)+'\n');console.log('Generated content-based Lakbay release '+release.id);
