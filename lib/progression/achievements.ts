export type RiderStats={rides:number;distanceKm:number;destinations:number;weekend:boolean;early:boolean;night:boolean;maintenance:number;prepared:boolean};
export const ACHIEVEMENTS=[
  {id:'first-ride',name:'First Ride',detail:'Complete your first ride.',xp:25,goal:1,value:(s:RiderStats)=>s.rides},
  {id:'five-rides',name:'5 Rides Completed',detail:'Complete five rides at your own pace.',xp:50,goal:5,value:(s:RiderStats)=>s.rides},
  {id:'ten-rides',name:'10 Rides Completed',detail:'Complete ten rides.',xp:75,goal:10,value:(s:RiderStats)=>s.rides},
  {id:'distance-100',name:'100 km Total Distance',detail:'Record 100 km across completed rides.',xp:50,goal:100,value:(s:RiderStats)=>s.distanceKm},
  {id:'distance-500',name:'500 km Total Distance',detail:'Record 500 km across completed rides.',xp:100,goal:500,value:(s:RiderStats)=>s.distanceKm},
  {id:'distance-1000',name:'1,000 km Total Distance',detail:'Record 1,000 km across completed rides. Take regular breaks.',xp:150,goal:1000,value:(s:RiderStats)=>s.distanceKm},
  {id:'explorer',name:'New Explorer',detail:'Complete rides to three different destination areas.',xp:50,goal:3,value:(s:RiderStats)=>s.destinations},
  {id:'weekend',name:'Weekend Rider',detail:'Complete a ride that started on a weekend.',xp:25,goal:1,value:(s:RiderStats)=>Number(s.weekend)},
  {id:'early',name:'Early Rider',detail:'Record a routine ride starting from 05:00–08:59. Ride only when rested.',xp:25,goal:1,value:(s:RiderStats)=>Number(s.early)},
  {id:'night',name:'Night Rider',detail:'Record a routine ride starting from 19:00–04:59. Visibility and rest come first.',xp:25,goal:1,value:(s:RiderStats)=>Number(s.night)},
  {id:'maintenance',name:'Maintenance Ready',detail:'Record your first maintenance reminder or service.',xp:25,goal:1,value:(s:RiderStats)=>s.maintenance},
  {id:'prepared',name:'Prepared Rider',detail:'Save a vehicle with fuel economy and a maintenance reminder.',xp:25,goal:1,value:(s:RiderStats)=>Number(s.prepared)},
] as const;
export function rideTimeFlags(started:number){
  const date=new Date(started+8*3600000),hour=date.getUTCHours();
  return {weekend:[0,6].includes(date.getUTCDay()),early:hour>=5&&hour<9,night:hour>=19||hour<5};
}
