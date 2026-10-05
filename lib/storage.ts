import {Pool} from 'pg';
import {SqlDatabase} from './sql-database';

let pool:Pool|undefined;
export function database(){
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is not configured');
  if(!pool){
    pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,allowExitOnIdle:true});
    pool.on('error',()=>console.error('An idle database connection failed.'));
  }
  return new SqlDatabase((sql,values)=>pool!.query(sql,values));
}
// Small, private 256px avatars live with their owner's records. No public bucket URL.
export function avatars(){return {
  async get(key:string){const file=await database().prepare('SELECT body FROM avatars WHERE key=?').bind(key).first<{body:Buffer}>();return file?{body:new Uint8Array(file.body)}:null;},
  async put(key:string,bytes:Uint8Array){await database().prepare('INSERT INTO avatars(key,body) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body').bind(key,Buffer.from(bytes)).run();},
};}
