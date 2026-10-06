// All progression tuning lives here. No speed or acceleration inputs.
export const XP = {ride:50, distanceStepKm:5, distanceStep:5, distanceCapKm:50, maxRidesPerDay:5, longRideSeconds:7200, maintenance:25, maxServicesPerDay:3, discovery:20, streak:15, rating:5} as const;
export const TIERS = [
  {name:'Bronze',xp:0,color:'#ad784e'}, {name:'Silver',xp:500,color:'#8799a8'},
  {name:'Gold',xp:1500,color:'#b89227'}, {name:'Platinum',xp:3500,color:'#579e9b'},
  {name:'Diamond',xp:7000,color:'#559dcc'}, {name:'Master',xp:12000,color:'#8b6ac4'},
  {name:'Godlike',xp:20000,color:'#be6d87'},
] as const;
export const STATE_ID='progression:state';
