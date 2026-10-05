import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const manifest=process.argv[2];
if(!manifest||!process.env.DATABASE_URL)throw Error('Usage: npm run db:import-avatars -- /absolute/path/manifest.json (set DATABASE_URL).');
const root=path.dirname(path.resolve(manifest)),entries=JSON.parse(await readFile(manifest,'utf8'));
if(!Array.isArray(entries))throw Error('Avatar manifest must be an array.');
const keys=new Set(),files=[];
for(const item of entries){
  if(typeof item.key!=='string'||!item.key.startsWith('avatars/')||typeof item.file!=='string'||keys.has(item.key))throw Error('Invalid or duplicate avatar key.');
  keys.add(item.key);
  const file=path.resolve(root,item.file),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Avatar file must be inside the manifest directory.');
  const bytes=await readFile(file);
  if(bytes.length>150000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Invalid avatar JPEG.');
  files.push({key:item.key,bytes});
}
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
try{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');let imported=0,unchanged=0;
    for(const {key,bytes} of files){
      const inserted=await client.query('INSERT INTO avatars(key,body) VALUES($1,$2) ON CONFLICT(key) DO NOTHING RETURNING key',[key,bytes]);
      if(inserted.rows.length){imported++;continue;}
      const existing=await client.query('SELECT body FROM avatars WHERE key=$1',[key]);
      if(!existing.rows[0]?.body.equals(bytes))throw Error('Target has a conflicting avatar; import rolled back.');
      unchanged++;
    }
    await client.query('COMMIT');console.log({imported,unchanged});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}finally{await pool.end();}
