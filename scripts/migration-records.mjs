export async function importRecords(client,rows){
  if(!Array.isArray(rows))throw Error('Export must contain an array of records.');
  const keys=new Set();
  for(const row of rows){
    if(!row||['owner','id','kind','data','updated'].some(key=>typeof row[key]!=='string'))throw Error('Invalid record in export. No data was imported.');
    JSON.parse(row.data);
    const key=JSON.stringify([row.owner,row.id]);
    if(keys.has(key))throw Error('Duplicate owner/id in export. No data was imported.');
    keys.add(key);
  }
  await client.query('BEGIN');
  try{
    let imported=0,unchanged=0;
    for(const row of rows){
      const result=await client.query('INSERT INTO records(owner,id,kind,data,updated) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner,id) DO NOTHING RETURNING id',[row.owner,row.id,row.kind,row.data,row.updated]);
      if(result.rows.length){imported++;continue;}
      const existing=await client.query('SELECT kind,data,updated FROM records WHERE owner=$1 AND id=$2',[row.owner,row.id]);
      const prior=existing.rows[0];
      if(!prior||prior.kind!==row.kind||prior.data!==row.data||prior.updated!==row.updated)throw Error('Target has a conflicting record. Import rolled back; resolve the conflict before retrying.');
      unchanged++;
    }
    await client.query('COMMIT');
    return {imported,unchanged};
  }catch(error){await client.query('ROLLBACK');throw error;}
}
