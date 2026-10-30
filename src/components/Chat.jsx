import {apiUrl} from '../lib/api';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,MessageSquare} from 'lucide-react';

export function Chat({code,mode,language}){
 const [messages,setMessages]=useState([]);const [input,setInput]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [retry,setRetry]=useState(null);const active=useRef(null);const output=useRef(null);
 useEffect(()=>{active.current?.abort();active.current=null;setMessages([]);setError('');setRetry(null);setBusy(false);return()=>{active.current?.abort();active.current=null}},[code,mode,language]);
 useEffect(()=>{output.current?.scrollTo({top:output.current.scrollHeight,behavior:'instant'})},[messages]);
 async function send(text,history=messages,regenerate=false){
  if(!text.trim()||active.current)return;
  if(!code.trim()){setError('Add Python code in the workspace first.');return}
  const controller=new AbortController();active.current=controller;setBusy(true);setError('');setRetry({text,history});
  const conversation=[...history,{role:'user',content:text},{role:'assistant',content:''}];setMessages(conversation);setInput('');
  const timeout=setTimeout(()=>controller.abort('timeout'),65000);
  let done=false;
  try{
   const response=await fetch(apiUrl('/api/chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,mode:mode.toLowerCase(),language,message:text,history:history.slice(-10).filter(m=>m.content).map(({role,content})=>({role,content})),regenerate}),signal:controller.signal});
   if(!response.ok){const result=await response.json();throw new Error(typeof result.detail==='string'?result.detail:'The tutor request failed.')}
   const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let answer='';
   try{
    while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true}).replace(/\r\n/g,'\n');let boundary;
     while((boundary=buffer.indexOf('\n\n'))!==-1){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const type=block.split('\n').find(l=>l.startsWith('event:'))?.slice(6).trim();const raw=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!raw)continue;const data=JSON.parse(raw);
      if(type==='error')throw new Error(data.message);
      if(type==='done')done=true;
      if(type==='token'){answer+=data.text;if(active.current===controller)setMessages([...conversation.slice(0,-1),{role:'assistant',content:answer}])}
     }
    }
   }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   if(!done)throw new Error('The reply was interrupted. Please regenerate.');
   if(active.current===controller)setRetry(null);
  }catch(e){if(active.current===controller)setError(controller.signal.reason==='timeout'?'The reply timed out. Please regenerate.':e instanceof TypeError||e instanceof SyntaxError?'Could not reach the tutor service. Please retry.':e.message)}
  finally{clearTimeout(timeout);if(active.current===controller){active.current=null;setBusy(false)}}
 }
 return <section className="chat"><span className="badge">AI-generated, may contain mistakes</span><p className="muted">Uses your current workspace code. Code and conversation are sent to the configured AI provider.</p><div className="messages" ref={output} aria-live="polite" aria-busy={busy}>{messages.length?messages.map((m,i)=><div className={'message '+(m.role==='user'?'You':'Tutor')} key={i}><b>{m.role==='user'?'You':'Tutor'}</b><p style={{whiteSpace:'pre-wrap'}}>{m.content||(busy?'Thinking…':'No answer received.')}</p></div>):<div className="empty"><MessageSquare size={34}/><h2>Ask about your Python code.</h2><p>Explore its purpose, logic or complexity.</p></div>}</div>{error&&<div className="feedback" role="alert"><p>{error}</p>{retry&&<button disabled={busy} onClick={()=>send(retry.text,retry.history,true)}>Regenerate reply</button>}</div>}<div className="chips">{['Explain the main idea','What is the complexity?','Help me prepare for a viva'].map(q=><button disabled={busy} key={q} onClick={()=>send(q)}>{q}</button>)}</div><form onSubmit={e=>{e.preventDefault();send(input)}}><input maxLength={4000} aria-label="Message to tutor" value={input} onChange={e=>setInput(e.target.value)} placeholder="What would you like to understand?"/><button disabled={busy||!input.trim()} className="primary">{busy?'Replying…':'Send'}<ArrowRight size={16}/></button></form></section>
}
