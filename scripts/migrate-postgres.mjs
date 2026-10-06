import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before running migrations.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
try{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(72190341)");
    await client.query(await readFile(new URL('../db/postgres/001_initial.sql',import.meta.url),'utf8'));
    await client.query(await readFile(new URL('../db/postgres/002_progression.sql',import.meta.url),'utf8'));
    await client.query(await readFile(new URL('../db/postgres/003_notifications.sql',import.meta.url),'utf8'));
    await client.query('COMMIT');
    console.log('PostgreSQL schema ready; existing rows were preserved.');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}finally{await pool.end();}
