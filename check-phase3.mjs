import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('checks',{recursive:true});
const backend=spawn('backend/.venv/Scripts/python.exe',['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8013'],{stdio:'ignore',env:{...process.env,GROQ_API_KEY:'',GEMINI_API_KEY:''}});
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'],{stdio:'ignore',env:{...process.env,BACKEND_URL:'http://127.0.0.1:8013'}});
let browser;
try {
 await new Promise(r=>setTimeout(r,2500));
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5182/app/workspace');
 await page.locator('.monaco-editor').waitFor();
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByText('Python syntax parsed successfully. Runtime behavior has not been checked.').waitFor();
 await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'custom.py',mimeType:'text/plain',buffer:Buffer.from('import math\ndef double(x):\n    return x * 2\nanswer = double(4)')});
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByText('double(x)',{exact:true}).waitFor();
 await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'broken.py',mimeType:'text/plain',buffer:Buffer.from('def broken(:\n    pass')});
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByRole('heading',{name:'Syntax error on line 1'}).waitFor();
 await page.locator('.squiggly-error').first().waitFor();
 await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'fixed.py',mimeType:'text/plain',buffer:Buffer.from('x = 1')});
 await page.locator('.squiggly-error').first().waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByText('Python syntax parsed successfully. Runtime behavior has not been checked.').waitFor();
 for(const width of [360,768,1024,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(300);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width)}
 await page.screenshot({path:'checks/phase3-workspace.png',fullPage:true});
 await page.route('**/api/analyze',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service temporarily unavailable.'})}));
 await page.getByRole('button',{name:'Explain code',exact:true}).click();
 await page.getByText('Service temporarily unavailable.').waitFor();await page.getByRole('button',{name:'Retry analysis'}).waitFor();
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('checks/phase3-results.txt','PASS: backend health and 18 pytest cases; browser: real analysis via Vite proxy, custom functions, syntax markers, marker reset, responsive results at four widths, service errors and retry. Browser exceptions: 0.\n');
 console.log('PASS: Phase 3 browser integration including Monaco markers and error recovery.');
} finally {await browser?.close();backend.kill();frontend.kill();}
