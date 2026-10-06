export function workerRequest(worker:ServiceWorker,message:unknown,timeout=4000):Promise<{version?:string;ok?:boolean;error?:string}>{
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();reject(Error('The update worker did not respond. Please retry.'));},timeout);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};
    worker.postMessage(message,[channel.port2]);
  });
}
