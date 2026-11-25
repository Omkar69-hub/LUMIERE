import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const root=new URL('../frontend/dist/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('.vite/manifest.json',root),'utf8'));
const entry=Object.keys(manifest).find(k=>manifest[k].isEntry);
if(!entry)throw Error('No build entry in manifest.');
const seen=new Set(),files=new Set();
function walk(key){if(seen.has(key))return;seen.add(key);const item=manifest[key];if(!item)throw Error('Missing manifest dependency '+key);files.add(item.file);for(const css of item.css??[])files.add(css);for(const dep of item.imports??[])walk(dep);}
walk(entry);
let js=0,css=0;
for(const path of files){const n=gzipSync(readFileSync(new URL(path,root))).length;if(path.endsWith('.js'))js+=n;else if(path.endsWith('.css'))css+=n;}
console.log('Initial gzip JavaScript: '+Math.round(js/1024)+' KiB; CSS: '+Math.round(css/1024)+' KiB (excluding lazy chunks and images).');
if(js>150*1024||css>30*1024)throw Error('Initial bundle exceeds 150 KiB JS / 30 KiB CSS regression budget.');
