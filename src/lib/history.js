import {useSyncExternalStore} from 'react';
const KEY='code-tutor-history-v1';const listeners=new Set();
const empty=()=>({analyses:[],quizzes:[]});
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));return d&&Array.isArray(d.analyses)&&Array.isArray(d.quizzes)?d:empty()}catch{return empty()}}
let data=load();let storageError='';
export function codeId(code){let hash=2166136261;for(let i=0;i<code.length;i++){hash^=code.charCodeAt(i);hash=Math.imul(hash,16777619)}return code.length+'-'+(hash>>>0).toString(16)}
function write(next){data=next;let text=JSON.stringify(data);while(text.length>1500000&&(data.analyses.length>1||data.quizzes.length>1)){if(data.analyses.length>1)data.analyses.pop();else data.quizzes.pop();text=JSON.stringify(data)}try{localStorage.setItem(KEY,text);storageError=''}catch{storageError='Browser storage is full or unavailable. This session is kept in memory only.'}listeners.forEach(fn=>fn())}
export function saveAnalysis(record){const key=codeId(record.code);const item={...record,id:crypto.randomUUID(),codeId:key,createdAt:new Date().toISOString()};write({...data,analyses:[item,...data.analyses.filter(x=>x.codeId!==key||x.mode!==record.mode||x.language!==record.language)].slice(0,15)})}
export function saveQuiz(record){write({...data,quizzes:[{...record,id:crypto.randomUUID(),createdAt:new Date().toISOString()},...data.quizzes].slice(0,30)})}
export function removeAnalysis(id){write({...data,analyses:data.analyses.filter(x=>x.id!==id)})}
export function clearHistory(){write(empty())}
export function useHistory(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>data)}
export function historyWarning(){return storageError}
window.addEventListener('storage',e=>{if(e.key===KEY){data=load();listeners.forEach(fn=>fn())}});
