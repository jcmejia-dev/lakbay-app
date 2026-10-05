import WeatherIcon from './weather-icon';
import {forecastAt,weatherName,type Weather} from '@/lib/weather';
export default function WeatherSummary({weather,error,busy,destination,etaSeconds,now,hasPosition}:{weather:Weather|null;error:string;busy:boolean;destination?:string;etaSeconds:number;now:number;hasPosition:boolean}) {
  if(!weather)return <span>{busy?'Checking weather…':'Weather unavailable'}{error?' · offline or unavailable':''}</span>;
  const current=weather.weather[0],target=destination?weather.weather[1]:undefined,forecast=target?forecastAt(target,now+etaSeconds*1000):null;
  const near=forecastAt(current,now);
  const temp=(value:number|null|undefined)=>typeof value==='number'?`${Math.round(value)}°C`:'—';
  const rain=forecast?.rain??null;
  return <span className="compact-weather-content"><span className="weather-row"><WeatherIcon code={current.current.weather_code} wind={current.current.wind_speed_10m} precipitation={current.current.precipitation} night={current.current.is_day===0}/><span>{hasPosition?'Here':'Preview area'} {temp(current.current.temperature_2m)} · {weatherName(current.current.weather_code)}{near?.rain!==null&&near?.rain!==undefined?` · ${near.rain}% rain`:''}</span></span>
    {target&&<span className="weather-row" title={destination}><WeatherIcon code={forecast?.code??null} wind={forecast?.wind} night={forecast?.night}/><span>Destination {forecast?`${temp(forecast.temperature)} · ${weatherName(forecast.code)}${rain!==null?` · ${rain}% rain`:''}`:'Forecast unavailable for arrival time'}</span></span>}
    {rain!==null&&rain>=40&&<strong>Possible rain near destination</strong>}
    <small>Updated {Math.max(0,Math.floor((now-weather.fetchedAt)/60000))} min ago{error?' · showing last update':''}</small>
  </span>;
}
