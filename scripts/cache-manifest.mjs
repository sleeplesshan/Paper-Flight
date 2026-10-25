import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function walk(dir){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())result.push(...await walk(p));else result.push(p)}return result}
const paths=(await walk('dist')).filter(p=>!p.endsWith('/sw.js')&&!p.endsWith('/cache-manifest.json')).sort();const hash=createHash('sha256');for(const p of paths)hash.update(await readFile(p));const version=hash.digest('hex').slice(0,12);
await writeFile('dist/cache-manifest.json',JSON.stringify({version,files:['/',...paths.map(p=>'/'+p.slice(5))]}));
let sw=await readFile('public/sw.js','utf8');await writeFile('dist/sw.js',sw.replace('__VERSION__',version));console.log(`Offline manifest ${version}: ${paths.length} files`);
