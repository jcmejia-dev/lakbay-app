export type QueryResult={rows:Record<string,unknown>[];rowCount?:number|null};
export type QueryExecutor=(sql:string,values:unknown[])=>Promise<QueryResult>;
// Keep the existing record repository interface; values always stay out of SQL text.
export function postgresParameters(sql:string){
  let index=0;
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g,part=>part==='?'?'$'+(++index):part);
}
export class SqlDatabase {
  constructor(private execute:QueryExecutor){}
  prepare(sql:string){return new SqlStatement(this.execute,postgresParameters(sql));}
}
class SqlStatement {
  constructor(private execute:QueryExecutor,private sql:string,private values:unknown[]=[]){ }
  bind(...values:unknown[]){return new SqlStatement(this.execute,this.sql,values);}
  async first<T=Record<string,unknown>>():Promise<T|null>{return (await this.execute(this.sql,this.values)).rows[0] as T||null;}
  async all<T=Record<string,unknown>>(){return {results:(await this.execute(this.sql,this.values)).rows as T[]};}
  async run(){const result=await this.execute(this.sql,this.values);return {success:true,changes:result.rowCount??0};}
}
