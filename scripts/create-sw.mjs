import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const directory = path.resolve('dist');
async function files(folder, prefix = '') {
  const entries = await readdir(folder, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.name === 'sw.js') continue;
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      result.push(...(await files(path.join(folder, entry.name), `${relative}/`)));
    else result.push(relative);
  }
  return result;
}
const assets = await files(directory);
const hash = createHash('sha256');
for (const asset of assets) hash.update(await readFile(path.join(directory, asset)));
const name = `personal-fitness-${hash.digest('hex').slice(0, 16)}`;
await writeFile(
  path.join(directory, 'sw.js'),
  `const CACHE=${JSON.stringify(name)};const ASSETS=${JSON.stringify(assets.map((name) => `./${name}`))};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('personal-fitness-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;event.respondWith(caches.open(CACHE).then(async cache=>{if(event.request.mode==='navigate')return (await cache.match('./index.html',{ignoreVary:true}))||fetch(event.request);const cached=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});if(cached)return cached;return fetch(event.request);}));});
`,
);
console.log(`Offline shell generated (${assets.length} assets).`);
