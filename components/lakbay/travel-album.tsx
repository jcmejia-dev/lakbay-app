'use client';
import {useState} from 'react';
import {Bookmark,MapPin,Navigation,Route,Trash2,Fuel,Wrench} from 'lucide-react';
import type {SavedPlace,SavedTrip} from '@/lib/navigation';

export default function TravelAlbum({places,trips,onUse,onDeletePlace,onDeleteTrip}:{places:SavedPlace[];trips:SavedTrip[];onUse:(trip:SavedTrip)=>void;onDeletePlace:(id:string)=>void;onDeleteTrip:(id:string)=>void}){
  const [section,setSection]=useState<'places'|'routes'>('places');
  return <section className="travel-album card">
    <div className="section-heading"><div><p className="eyebrow">YOUR PLACES, YOUR WAY BACK</p><h2>Travel album</h2></div><Bookmark size={21}/></div>
    <p className="subtle">Keep favourite stops and road routes. Saved routes include turn instructions for offline reference.</p>
    <div className="album-tabs" role="tablist" aria-label="Travel album">
      <button role="tab" aria-selected={section==='places'} onClick={()=>setSection('places')}>Places <span>{places.length}</span></button>
      <button role="tab" aria-selected={section==='routes'} onClick={()=>setSection('routes')}>Saved routes <span>{trips.length}</span></button>
    </div>
    {section==='places' ? (places.length ? <div className="album-list">{places.map(place=>{
      const Icon=place.category==='fuel'?Fuel:place.category==='shop'?Wrench:MapPin;
      return <article className="album-item" key={place.id}>
        <span className="icon-box"><Icon size={20}/></span>
        <div><strong>{place.name}</strong><small>{place.label||`${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`}</small><small>Saved {new Date(place.savedAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</small></div>
        <button aria-label={`Remove ${place.name}`} onClick={()=>onDeletePlace(place.id)}><Trash2 size={17}/></button>
      </article>;
    })}</div> : <div className="album-empty"><MapPin size={23}/><strong>No places saved yet</strong><span>Save a destination or nearby stop from your map tools.</span></div>) : (trips.length ? <div className="album-list">{trips.map(trip=><article className="album-item" key={trip.id}>
      <span className="icon-box"><Route size={20}/></span>
      <div><strong>{trip.name}</strong><small>{trip.from.name||'Start'} → {trip.to.name||'Destination'}</small><small>{(trip.route.distance/1000).toFixed(1)} km · {trip.route.steps.length} turns · saved directions</small></div>
      <button className="album-use" aria-label={`Use route ${trip.name}`} onClick={()=>onUse(trip)}><Navigation size={17}/><span>Go</span></button>
      <button aria-label={`Remove route ${trip.name}`} onClick={()=>onDeleteTrip(trip.id)}><Trash2 size={17}/></button>
    </article>)}</div> : <div className="album-empty"><Route size={23}/><strong>No routes saved yet</strong><span>Plan a destination, then save its route from map tools.</span></div>)}
  </section>;
}
