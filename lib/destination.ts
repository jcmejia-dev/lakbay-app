import type {Location,RoadRoute} from './navigation';
export type DestinationState={destination:Location|null;route:RoadRoute|null;routeStart:Location|null;alternatives:RoadRoute[];busy:boolean;error:string};
export const emptyDestination:DestinationState={destination:null,route:null,routeStart:null,alternatives:[],busy:false,error:''};
export type DestinationAction={type:'clear'}|{type:'plan';destination:Location;origin:Location;keepRoute?:boolean}|{type:'ready';routes:RoadRoute[];selected:number}|{type:'error';message:string}|{type:'select';index:number};
export function destinationReducer(state:DestinationState,action:DestinationAction):DestinationState {
  switch(action.type){
    case 'clear':return {...emptyDestination};
    case 'plan':return {...state,destination:action.destination,routeStart:action.origin,route:action.keepRoute?state.route:null,alternatives:action.keepRoute?state.alternatives:[],busy:true,error:''};
    case 'ready':return state.destination?{...state,route:action.routes[action.selected]||action.routes[0]||null,alternatives:action.routes,busy:false,error:''}:state;
    case 'error':return {...state,busy:false,error:action.message};
    case 'select':return action.index>=0&&action.index<state.alternatives.length?{...state,route:state.alternatives[action.index]}:state;
  }
}
