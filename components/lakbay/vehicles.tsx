'use client';
import {useState} from 'react';
import type {Garage,Vehicle} from '@/lib/fuel';

export default function Vehicles({garage,legacyName,onSave}:{garage:Garage;legacyName:string;onSave:(g:Garage)=>Promise<void>}) {
  const [editing,setEditing]=useState<Vehicle|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(g:Garage){setBusy(true);setError('');try{await onSave(g);setEditing(null);}catch(e){setError(e instanceof Error?e.message:'Could not save vehicles');}finally{setBusy(false);}}
  return <section className="card vehicles-card"><h2>Vehicle profiles</h2><p className="subtle">Save your vehicle’s average economy for fuel estimates.</p>
    {garage.vehicles.map(v=><div key={v.id} className="vehicle-row"><span><strong>{v.name}</strong><small>{v.type} · {v.kmPerLiter} km/L{v.tankLiters?` · ${v.tankLiters} L tank`:''}</small></span><button className="secondary" disabled={busy} onClick={()=>save({...garage,activeVehicleId:v.id})} aria-pressed={garage.activeVehicleId===v.id}>{garage.activeVehicleId===v.id?'Active':'Select'}</button><button className="small-button" disabled={busy} onClick={()=>setEditing({...v})}>Edit</button></div>)}
    {!garage.vehicles.length&&<p className="subtle">Your existing motorcycle details are kept below. Add its fuel economy to enable estimates.</p>}
    {!editing&&garage.vehicles.length<12&&<button className="secondary" disabled={busy} onClick={()=>setEditing({id:crypto.randomUUID(),name:garage.vehicles.length?'':legacyName,type:'motorcycle',kmPerLiter:0})}>Add vehicle</button>}
    {editing&&<form onSubmit={e=>{e.preventDefault();if(!Number.isFinite(editing.kmPerLiter)||editing.kmPerLiter<=0)return;const vehicles=[...garage.vehicles.filter(v=>v.id!==editing.id),editing];void save({vehicles,activeVehicleId:garage.activeVehicleId||editing.id});}}>
      <label className="field-label">Vehicle name<input required maxLength={80} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
      <label className="field-label">Vehicle type<select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value as Vehicle['type']})}><option value="motorcycle">Motorcycle</option><option value="car">Car</option></select></label>
      <div className="two-fields"><label className="field-label">Average km/L<input type="number" required min="0.1" max="200" step="0.1" value={editing.kmPerLiter||''} onChange={e=>setEditing({...editing,kmPerLiter:Number(e.target.value)})}/></label><label className="field-label">Tank capacity (L, optional)<input type="number" min="0.1" max="500" step="0.1" value={editing.tankLiters??''} onChange={e=>setEditing({...editing,tankLiters:e.target.value?Number(e.target.value):undefined})}/></label></div>
      <label className="field-label">Notes (optional)<textarea maxLength={500} value={editing.notes||''} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label>
      <div className="actions"><button className="dark-button" disabled={busy}>{busy?'Saving…':'Save vehicle'}</button><button className="secondary" type="button" disabled={busy} onClick={()=>setEditing(null)}>Cancel</button></div>
    </form>}{error&&<p role="alert" className="inline-error">{error}</p>}
  </section>;
}
