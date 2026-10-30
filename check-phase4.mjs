import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('checks',{recursive:true});
const backend=spawn('backend/.venv/Scripts/python.exe',['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8010'],{stdio:'ignore',env:{...process.env,GROQ_API_KEY:'',GEMINI_API_KEY:'',AI_PROVIDER:'groq'}});
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184','--strictPort'],{stdio:'ignore',env:{...process.env,BACKEND_URL:'http://127.0.0.1:8010'}});
let browser;
const explanation={summary:'This program computes a factorial.',objective:'Multiply the integers from 1 through n.',line_explanations:[{start_line:1,end_line:5,text:'Define factorial and compute the product.'},{start_line:7,end_line:7,text:'Print the result for five.'}],functions:['factorial(n): computes the product.'],variables:['result: running product'],concepts:['Loops','Functions'],complexity:'O(n) time, O(1) auxiliary space.',expected_output:{kind:'predicted',text:'120',caveat:'Predicted without running the code.'}};
try{
 await new Promise(r=>setTimeout(r,2500));browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5184/app/workspace');await page.locator('.monaco-editor').waitFor();
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByText('Python syntax parsed successfully. Runtime behavior has not been checked.').waitFor();
 await page.getByRole('heading',{name:'Explanation unavailable'}).waitFor();await page.getByText(/AI is not configured/).waitFor();
 await page.route('**/api/explain',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(explanation)}));
 await page.getByRole('button',{name:'Regenerate',exact:true}).click();await page.getByText(explanation.summary,{exact:true}).waitFor();
 await page.getByText('Predicted without running the code.').waitFor();await page.getByRole('tab',{name:'Line-by-line'}).click();await page.getByRole('button',{name:/1–5/}).click();
 await page.getByRole('tab',{name:'Complexity',exact:true}).click();await page.getByText(explanation.complexity,{exact:true}).waitFor();
 for(const width of [360,768,1024,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(250);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+width)}
 await page.getByRole('button',{name:'Ask tutor',exact:true}).click();await page.getByRole('textbox',{name:'Message to tutor'}).fill('Explain this code');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('button',{name:'Regenerate reply'}).waitFor();
 const reply='I can explain the factorial loop. The result is a prediction.';
 await page.route('**/api/chat',r=>r.fulfill({status:200,contentType:'text/event-stream',body:'event: meta\ndata: {}\n\nevent: token\ndata: '+JSON.stringify({text:reply.slice(0,25)})+'\n\nevent: token\ndata: '+JSON.stringify({text:reply.slice(25)})+'\n\nevent: done\ndata: {}\n\n'}));
 await page.getByRole('button',{name:'Regenerate reply'}).click();await page.getByText(reply,{exact:true}).waitFor();
 await page.route('**/api/chat',r=>r.fulfill({status:200,contentType:'text/event-stream',body:'event: token\ndata: {"text":"Partial answer"}\n\nevent: error\ndata: {"message":"Provider interrupted the stream."}\n\n'}));
 await page.getByRole('textbox',{name:'Message to tutor'}).fill('More detail');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Provider interrupted the stream.',{exact:true}).waitFor();await page.getByRole('button',{name:'Regenerate reply'}).waitFor();
 await page.goto('http://127.0.0.1:5184/app/settings');await page.getByRole('combobox').nth(0).selectOption('Intermediate');await page.getByText('English only',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:5184/app/workspace');
 let settings;
 await page.route('**/api/explain',r=>{settings=r.request().postDataJSON();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(explanation)})});
 await page.getByRole('button',{name:'Explain code',exact:true}).click();await page.getByText(explanation.summary,{exact:true}).waitFor();if(settings.mode!=='intermediate'||settings.language!=='English')throw Error('Settings were not sent');
 await page.screenshot({path:'checks/phase4-workspace.png',fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('checks/phase4-results.txt','PASS: real backend analysis and missing-key errors; controlled browser responses for explanation/line ranges/complexity/predicted output/regenerate; SSE token assembly and interrupted-stream error/retry; mode and language forwarding; no horizontal overflow at 360/768/1024/1440px. Browser exceptions: 0. Live provider requests NOT tested: no credentials configured.\n');console.log('PASS: Phase 4 frontend integration checks.');
}finally{await browser?.close();backend.kill();frontend.kill()}
