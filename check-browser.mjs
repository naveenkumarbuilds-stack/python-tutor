import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185','--strictPort'],{stdio:'ignore'});
process.on('exit',()=>server.kill());
await new Promise(r=>setTimeout(r,2000));
import { chromium } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('checks',{recursive:true});
let browser;
try {browser=await chromium.launch({headless:true,channel:'msedge'});} catch {browser=await chromium.launch({headless:true,channel:'chrome'});}
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await fs.promises.mkdir('checks',{recursive:true});
await page.route('https://fonts.googleapis.com/**',r=>r.abort());
// General UI smoke uses controlled AI responses; check-phase4.mjs also checks the real backend failure path.
await page.route('**/api/analyze',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({syntax_valid:true,syntax_error:null,functions:[],loops:[],conditionals:[],variables:[],imports:[],complexity:{estimate:'Unknown',loop_nesting:0,note:'Controlled browser fixture.'}})}));
await page.route('**/api/explain',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({summary:'Controlled explanation fixture.',objective:'Explain the sample.',line_explanations:[{start_line:1,end_line:1,text:'First source line.'}],functions:[],variables:[],concepts:['Loops'],complexity:'O(n) time, O(1) auxiliary space',expected_output:{kind:'predicted',text:'120',caveat:'Controlled fixture; not executed.'}})}));

const checks=[];
for(const width of [360,768,1024,1440]){
 await page.setViewportSize({width,height:900});
 for(const route of ['/','/app','/app/workspace','/app/tutor','/app/flowchart','/app/visualizer','/app/quizzes','/app/settings']){
  await page.goto('http://127.0.0.1:5185'+route);await page.waitForTimeout(350);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow) throw Error(`Horizontal overflow at ${width}: ${route}`);
  checks.push(`${width}px ${route}: no overflow`);
 }
}
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://127.0.0.1:5185/app/workspace');
await page.getByRole('button',{name:'Explain code',exact:true}).click();
await page.getByRole('heading',{name:'What this code does'}).waitFor();
await page.getByRole('tab',{name:'Complexity',exact:true}).click();
await page.getByText('O(n) time, O(1) auxiliary space',{exact:true}).waitFor();
await page.getByRole('tab',{name:'Complexity',exact:true}).press('ArrowLeft');
if(await page.getByRole('tab',{name:'Line-by-line'}).getAttribute('aria-selected')!=='true')throw Error('Tab keyboard selection failed');
await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('x')});
await page.getByRole('alert').filter({hasText:'Choose a Python'}).waitFor();
await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'large.py',mimeType:'text/plain',buffer:Buffer.alloc(102401)});
await page.getByText('Please choose a file smaller than 100 KB.').waitFor();
await page.getByLabel('Upload code or PDF',{exact:true}).setInputFiles({name:'custom.py',mimeType:'text/plain',buffer:Buffer.from('print(42)')});
await page.getByRole('button',{name:'Explain code',exact:true}).click();
await page.getByText('Python syntax parsed successfully. Runtime behavior has not been checked.').waitFor();
await page.getByRole('button',{name:'Clear code',exact:true}).click();
await page.getByRole('button',{name:'Explain code',exact:true}).click();
await page.getByText('Add some Python code first.').waitFor();
await page.getByRole('button',{name:'Toggle theme'}).click();
const dark=await page.locator('html').getAttribute('class');await page.reload();
if(await page.locator('html').getAttribute('class')!==dark)throw Error('Theme persistence failed');
await page.goto('http://127.0.0.1:5185/app/quizzes');
await page.getByRole('button',{name:'Generate code quiz',exact:true}).waitFor();
await page.setViewportSize({width:360,height:800});
await page.getByRole('button',{name:'Toggle navigation'}).click();
await page.getByRole('navigation',{name:'Main navigation'}).count();
await page.keyboard.press('Escape');
if(await page.locator('aside').isVisible())throw Error('Drawer did not close');
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5185/app');await page.screenshot({path:'checks/overview-desktop.png',fullPage:true});
await page.setViewportSize({width:360,height:800});await page.waitForTimeout(600);console.log(await page.locator('.main').evaluate(e=>({w:innerWidth,width:getComputedStyle(e).width,margin:getComputedStyle(e).marginLeft})));await page.screenshot({path:'checks/overview-mobile.png',fullPage:true});
if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
fs.writeFileSync('checks/results.txt',checks.join('\n')+'\nInteractions: explanation, keyboard tabs, file errors, custom/empty code, theme persistence, generated-quiz entry, mobile Escape: PASS\nBrowser errors: 0\n');
console.log('PASS: 32 viewport/route checks and interaction checks; zero browser errors.');await browser.close();

server.kill();
