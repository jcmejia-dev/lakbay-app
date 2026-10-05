import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
import {importRecords} from './migration-records.mjs';
const file=process.argv[2];
if(!file||!process.env.DATABASE_URL)throw Error('Usage: npm run db:import -- /absolute/path/records.json (set DATABASE_URL).');
const raw=JSON.parse(await readFile(file,'utf8'));
// Accept wrangler d1 execute --json output or a plain array of SELECT rows.
const rows=Array.isArray(raw)&&raw[0]?.results?raw.flatMap(item=>item.results):raw;
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
try{
  const client=await pool.connect();
  try{console.log(await importRecords(client,rows));}finally{client.release();}
}finally{await pool.end();}
