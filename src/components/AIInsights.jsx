export function AIInsights({ai,tab,line,chooseLine,syntaxError}){
 const data=ai.data;
 return <><span className="badge">AI-generated, may contain mistakes</span>
 {ai.loading?<div className="skeleton" role="status">Preparing your explanation…</div>
 :ai.error?<div role="alert"><h2>Explanation unavailable</h2><p>{ai.error}</p><button onClick={()=>ai.explain(null,true)}>Regenerate</button></div>
 :syntaxError?<p>Fix the syntax error shown below before requesting an explanation.</p>
 :!data?<div className="empty"><h2>Understand your Python code</h2><p>Click Explain code for a syntax check and an AI explanation. Your code will be sent to the configured AI provider.</p></div>
 :tab==='Summary'?<><h2>What this code does</h2><p>{data.summary}</p><h3>Objective</h3><p>{data.objective}</p><h3>Key concepts</h3><div className="chips">{data.concepts.map((text,i)=><span className="tag" key={i}>{text}</span>)}</div><h3>Functions</h3>{data.functions.map((text,i)=><p key={i}>{text}</p>)}<h3>Variables</h3>{data.variables.map((text,i)=><p key={i}>{text}</p>)}</>
 :tab==='Complexity'?<><h2>Time & space</h2><p>{data.complexity}</p><small>AI estimate; compare with the static structure results.</small></>
 :<><h2>Line {line}</h2><p>{data.line_explanations.find(item=>line>=item.start_line&&line<=item.end_line)?.text||'No explanation for this line.'}</p>{data.line_explanations.map((item,i)=><button className={`line-explanation ${line>=item.start_line&&line<=item.end_line?'selected':''}`} key={i} onClick={()=>chooseLine(item.start_line)}><span>{item.start_line}{item.end_line!==item.start_line?`–${item.end_line}`:''}</span>{item.text}</button>)}</>}
 {data&&!ai.loading&&<button onClick={()=>ai.explain(null,true)}>Regenerate explanation</button>}
 </>;
}
