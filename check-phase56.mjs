import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('checks',{recursive:true});
const backend=spawn('backend/.venv/Scripts/python.exe',['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8012'],{stdio:'ignore',env:{...process.env,GROQ_API_KEY:'',GEMINI_API_KEY:''}});
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5186','--strictPort'],{stdio:'ignore',env:{...process.env,BACKEND_URL:'http://127.0.0.1:8012'}});
const explanation={summary:'This program computes a factorial.',objective:'Compute a product.',line_explanations:[{start_line:1,end_line:5,text:'Define factorial.'},{start_line:7,end_line:7,text:'Print the result.'}],functions:['factorial(n)'],variables:['result stores the running product.'],concepts:['Loops','Functions'],complexity:'O(n) time.',expected_output:{kind:'predicted',text:'120',caveat:'Not executed.'}};
const kinds=['mcq','output prediction','conceptual','viva','debugging'];
const quiz={questions:kinds.map((kind,i)=>({kind,prompt:'Question '+(i+1)+': what is the result?',options:['120','24','5','0'],answer:0,explanation:'Multiply one through five.'}))};
const trace={label:'AI-predicted, not real runtime',steps:[{line:2,variables:[{name:'result',value:'1',type:'int'}],call_stack:[{name:'module',line:7},{name:'factorial',line:2}],output:'',explanation:'Initialize the product.'},{line:4,variables:[{name:'result',value:'120',type:'int'}],call_stack:[{name:'module',line:7},{name:'factorial',line:4}],output:'',explanation:'Show a later predicted state.'},{line:7,variables:[],call_stack:[{name:'module',line:7}],output:'120',explanation:'Print the result.'}],caveat:'Controlled test walkthrough. Not executed.',truncated:false};
const prediction={deterministic:true,dependencies:[],expected_output:{kind:'predicted',text:'120\n',caveat:'Not executed.'},explanation:'Multiplying one through five gives 120.'};
let browser;
try{
 await new Promise(r=>setTimeout(r,2500));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.route('**/api/explain',r=>r.fulfill({json:explanation}));
 await page.route('**/api/quiz',r=>r.fulfill({json:quiz}));
 await page.route('**/api/trace',r=>r.fulfill({json:trace}));
 await page.route('**/api/prediction',r=>r.fulfill({json:prediction}));
 await page.route('**/api/issues',r=>r.fulfill({json:{issues:[{start_line:1,end_line:5,label:'possible logic issue',reason:'Negative input has no specified handling.',suggested_fix:'Decide how negative inputs should be handled.',corrected_example:'if n < 0:\n    raise ValueError("nonnegative required")'}],note:'Uncertain suggestions.'}}));
 const base='http://127.0.0.1:5186';
 await page.goto(base+'/app/workspace',{waitUntil:'domcontentloaded'});await page.locator('.monaco-editor').waitFor();
 await page.getByRole('button',{name:'Explain code',exact:true}).click();await page.getByText(explanation.summary,{exact:true}).waitFor();
 await page.getByRole('button',{name:'Review possible issues'}).click();await page.getByText('Negative input has no specified handling.').waitFor();
 if(await page.locator('.monaco-editor').innerText().then(t=>t.includes('nonnegative required')))throw Error('Code was overwritten by a suggestion');
 await page.getByRole('textbox',{name:'Your output prediction'}).fill('120');await page.getByRole('button',{name:'Check prediction'}).click();await page.getByText('Matches the AI prediction.',{exact:true}).waitFor();
 await page.route('**/api/prediction',r=>r.fulfill({json:{...prediction,deterministic:false,dependencies:['User input'],expected_output:{kind:'predicted',text:'Unknown input.',caveat:'Input is needed.'}}}));await page.getByRole('button',{name:'Check prediction'}).click();await page.getByText('Output depends on information outside this code.').waitFor();
 await page.goto(base+'/app/flowchart',{waitUntil:'domcontentloaded'});await page.locator('.diagram svg').waitFor();await page.getByText(/Function bodies are separate/).waitFor();
 await page.goto(base+'/app/quizzes',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Generate code quiz'}).click();
 for(let i=0;i<5;i++){await page.getByRole('button',{name:i===0?'B 24':'A 120',exact:true}).click();await page.getByRole('button',{name:i===4?'See results':'Next question',exact:true}).click()}
 await page.getByText('4/5',{exact:true}).waitFor();await page.getByText('Your answer: 24',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Retry this quiz'}).click();await page.getByText('Question 1 of 5',{exact:true}).waitFor();
 await page.goto(base+'/app/visualizer',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Generate predicted trace'}).click();await page.getByText('Step 1 / 3',{exact:true}).waitFor();await page.getByRole('button',{name:'Step forward',exact:true}).click();await page.getByText('Step 2 / 3',{exact:true}).waitFor();await page.getByText('factorial',{exact:true}).waitFor();await page.getByRole('button',{name:'Reset',exact:true}).click();await page.getByText('Step 1 / 3',{exact:true}).waitFor();
 await page.goto(base+'/app/history',{waitUntil:'domcontentloaded'});await page.getByText('4/5',{exact:true}).waitFor();await page.getByRole('link',{name:'Restore code',exact:true}).click();await page.getByRole('button',{name:'Explain code',exact:true}).waitFor();
 await page.goto(base+'/app/notes',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Python code',exact:true}).waitFor();await page.getByText('Latest attempt: 4/5',{exact:false}).waitFor();
 await page.evaluate(()=>{window.print=()=>{window.__printed=true}});await page.getByRole('button',{name:'Save notes as PDF'}).click();if(!await page.evaluate(()=>window.__printed))throw Error('Print export did not open');
 await page.emulateMedia({media:'print'});await page.screenshot({path:'checks/notes-print-layout.png',fullPage:true});await page.emulateMedia({media:'screen'});
 const routes=['/app','/app/workspace','/app/flowchart','/app/quizzes','/app/visualizer','/app/history','/app/notes','/app/settings','/app/tutor','/'];
 for(const width of [360,768,1024,1440]){await page.setViewportSize({width,height:900});for(const route of routes){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(220);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width+' '+route)}}
 await page.goto(base+'/app/history',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Clear learning history'}).click();await page.getByText('Explain a program to save its code, explanation and concepts here.').waitFor();await page.reload();await page.getByText('Explain a program to save its code, explanation and concepts here.').waitFor();
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('checks/phase56-results.txt','PASS: real AST diagram; controlled AI issue review without code overwrite; output comparison and dependency warning; five-type quiz, score/mistake review/retry; predicted variables and stack stepping/reset; saved analyses and quiz scores across navigation/reload; restore and clear history; notes with code/explanation/concepts/quiz results; browser print export invoked and print layout captured; 40 route/viewport checks without horizontal overflow; zero browser exceptions. Successful AI content is controlled test data.\n');console.log('PASS: Phase 5/6 browser integration and 40 responsive checks.');
}finally{await browser?.close();backend.kill();frontend.kill()}
