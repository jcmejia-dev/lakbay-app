import {Pool} from 'pg';
import {SqlDatabase} from './sql-database';

let pool:Pool|undefined;
export function database(){
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is not configured');
  if(!pool){
    pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:3000,query_timeout:5000,statement_timeout:5000,allowExitOnIdle:true});
    pool.on('error',()=>console.error('An idle database connection failed.'));
  }
  return new SqlDatabase((sql,values)=>pool!.query(sql,values));
}
// A pinned client keeps the record and its progression events atomic.
export async function transaction<T>(owner:string,work:(db:SqlDatabase)=>Promise<T>):Promise<T>{
  database();
  const client=await pool!.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[owner]);
    const result=await work(new SqlDatabase((sql,values)=>client.query(sql,values)));
    await client.query('COMMIT');
    return result;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
// Small, private 256px avatars live with their owner's records. No public bucket URL.
export function avatars(){return {
  async get(key:string){const file=await database().prepare('SELECT body FROM avatars WHERE key=?').bind(key).first<{body:Buffer}>();return file?{body:new Uint8Array(file.body)}:null;},
  async put(key:string,bytes:Uint8Array){await database().prepare('INSERT INTO avatars(key,body) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').bind(key,Buffer.from(bytes)).run();},
};}
