import {useEffect,useRef,useState} from 'react';
import mermaid from 'mermaid';
import {useActivity} from '../hooks/useActivity';
import {ActivityStatus} from '../components/LearningTools';
export function ASTFlowchart({code,name,dark}){
 const activity=useActivity('flowchart',code);const target=useRef(null);const [zoom,setZoom]=useState(1);const [renderError,setRenderError]=useState('');
 useEffect(()=>{activity.run();setZoom(1)},[code]);
 useEffect(()=>{let cancelled=false;setRenderError('');if(!activity.data||!target.current)return;target.current.replaceChildren();mermaid.initialize({startOnLoad:false,theme:dark?'dark':'default',securityLevel:'strict',flowchart:{htmlLabels:false},maxEdges:600});mermaid.render('ast-'+crypto.randomUUID(),activity.data.mermaid).then(({svg})=>{if(!cancelled&&target.current)target.current.innerHTML=svg}).catch(()=>{if(!cancelled)setRenderError('The diagram could not be rendered. Try a smaller example.')});return()=>{cancelled=true}},[activity.data,dark]);
 return <><div className="page-heading"><div><div className="eyebrow">FOLLOW THE LOGIC</div><h1>Python flowchart</h1><p>{name} · current workspace code</p></div><span className="badge">Generated from Python AST · no AI request</span></div><section className="card"><div className="toolbar"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.25,z-.1))}>−</button><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(3,z+.1))}>+</button><button onClick={()=>setZoom(1)}>Reset / fit</button><button disabled={activity.loading} onClick={()=>activity.run()}>Refresh diagram</button></div><ActivityStatus activity={activity}/>{renderError&&<p role="alert">{renderError}</p>}<div className="diagram"><div ref={target} style={{transform:`scale(${zoom})`,transformOrigin:'top center'}}/></div>{activity.data?.notes.map((note,i)=><p key={i}>{note}</p>)}</section></>
}
