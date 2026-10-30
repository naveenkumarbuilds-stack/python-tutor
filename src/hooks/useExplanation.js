import {apiUrl} from '../lib/api';
import {useEffect,useRef,useState} from 'react';

export function useExplanation(code,mode,language) {
  const [state,setState]=useState({data:null,error:'',loading:false});
  const active=useRef(null);
  useEffect(()=>{active.current?.abort();active.current=null;setState({data:null,error:'',loading:false});return()=>{active.current?.abort();active.current=null}},[code,mode,language]);
  async function explain(analysis=null,regenerate=false){
    active.current?.abort();const controller=new AbortController();active.current=controller;
    setState({data:null,error:'',loading:true});const timeout=setTimeout(()=>controller.abort('timeout'),90000);
    try{
      const response=await fetch(apiUrl('/api/explain'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,analysis,mode:mode.toLowerCase(),language,regenerate}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'The explanation request failed. Please retry.');
      if(active.current===controller)setState({data,error:'',loading:false});
    }catch(e){if(active.current===controller)setState({data:null,error:controller.signal.reason==='timeout'?'The explanation timed out. Please regenerate.':e instanceof TypeError||e instanceof SyntaxError?'Could not reach the AI service. Check the backend and retry.':e.message,loading:false})}
    finally{clearTimeout(timeout)}
  }
  return {...state,explain};
}
