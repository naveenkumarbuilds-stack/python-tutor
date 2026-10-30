import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {apiUrl} from '../lib/api';

export const CodeInput=forwardRef(function CodeInput({setCode,setName,setNotice},ref){
 const input=useRef(null);const active=useRef(null);const version=useRef(0);const [draft,setDraft]=useState('');const [filename,setFilename]=useState('pasted_code.py');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 useEffect(()=>()=>{version.current++;active.current?.abort()},[]);
 async function upload(file){
  if(!file)return;const current=++version.current;active.current?.abort();setError('');setMessage('');setBusy(false);
  const extension=file.name.toLowerCase().split('.').pop();
  if(!['py','txt','pdf'].includes(extension)){setError('Choose a Python (.py), text (.txt), or PDF (.pdf) file.');return}
  const max=extension==='pdf'?750*1024:102400;if(file.size>max){setError(extension==='pdf'?'Choose a PDF smaller than 750 KB.':'Please choose a file smaller than 100 KB.');return}
  setBusy(true);let timer;
  try{
   if(extension==='pdf'){
    const controller=new AbortController();active.current=controller;timer=setTimeout(()=>controller.abort(),20000);
    const response=await fetch(apiUrl('/api/import-pdf'),{method:'POST',headers:{'Content-Type':'application/pdf'},body:file,signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.detail||'The PDF could not be read.');if(current!==version.current)return;
    setDraft(result.text);setFilename(file.name.replace(/\.pdf$/i,'.py'));setMessage('PDF text extracted. Review it below, then choose Use this text. '+result.note);
   }else{
    const text=await file.text();if(current!==version.current)return;if(new TextEncoder().encode(text).length>102400)throw new Error('The text exceeds 100 KB. Please choose a smaller file.');
    setCode(text);setName(file.name.replace(/\.txt$/i,'.py'));setDraft(text);setFilename(file.name.replace(/\.txt$/i,'.py'));setMessage('Code loaded into the editor. Your code is not executed.');setNotice('Code loaded.');
   }
  }catch(e){if(current===version.current)setError(e.name==='AbortError'?'PDF extraction timed out. Try a smaller PDF or paste its code.':e instanceof TypeError?'Could not reach the PDF service. Start the backend or paste the code manually.':e.message)}
  finally{clearTimeout(timer);if(current===version.current)setBusy(false)}
 }
 useImperativeHandle(ref,()=>({upload,open:()=>input.current?.click()}));
 function apply(){if(new TextEncoder().encode(draft).length>102400){setError('Paste at most 100 KB of code.');return}setCode(draft);setName(filename);setNotice('Pasted text loaded into the editor.');setMessage('Text loaded. Check the indentation before explaining.');setError('')}
 return <section className="card code-input" aria-label="Upload or paste code" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();upload(e.dataTransfer.files[0])}}><div className="section-title"><h2>Upload or paste your code</h2><label className="button upload-control"><Upload size={15}/>{busy?'Reading file…':'Upload .py, .txt or PDF'}<input ref={input} aria-label="Upload code or PDF" type="file" accept=".py,.txt,.pdf,text/plain,application/pdf" disabled={busy} onChange={e=>{upload(e.target.files[0]);e.target.value=''}}/></label></div><p>Drop a file here, or paste Python code below. PDFs need selectable text; review extracted text and indentation before loading.</p><textarea aria-label="Paste Python code or text" value={draft} onChange={e=>{setDraft(e.target.value);setFilename('pasted_code.py')}} placeholder="Paste Python code here, or review text extracted from a PDF…" rows={5} spellCheck={false}/><div className="input-actions"><button className="primary" disabled={busy||!draft.trim()} onClick={apply}>Use this text</button><small>.py / .txt: 100 KB · PDF: 750 KB, up to 20 pages</small></div>{busy&&<p role="status">Reading your file…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>
});
