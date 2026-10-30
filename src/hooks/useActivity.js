import {apiUrl} from '../lib/api';
import {useEffect,useRef,useState} from 'react';
export function useActivity(kind,code,mode='Beginner',language='English'){
 const [state,setState]=useState({data:null,error:'',loading:false});const active=useRef(null);
 useEffect(()=>{active.current?.abort();active.current=null;setState({data:null,error:'',loading:false});return()=>{active.current?.abort();active.current=null}},[kind,code,mode,language]);
 async function run(regenerate=false){
  active.current?.abort();const controller=new AbortController();active.current=controller;setState({data:null,error:'',loading:true});const timer=setTimeout(()=>controller.abort('timeout'),90000);
  try{const response=await fetch(apiUrl('/api/'+kind),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,mode:mode.toLowerCase(),language,regenerate}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The activity could not be generated.');if(active.current===controller){setState({data,error:'',loading:false});return data}}
  catch(e){if(active.current===controller)setState({data:null,error:controller.signal.reason==='timeout'?'This request timed out. Please retry with shorter code.':e instanceof TypeError||e instanceof SyntaxError?'The learning service is unavailable. Check the backend and retry.':e.message,loading:false})}
  finally{clearTimeout(timer)}
 }
 return {...state,run};
}
