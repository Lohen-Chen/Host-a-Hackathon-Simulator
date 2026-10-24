// Packs dist/ and the single-file fallback into dist.zip for the laptop backup plan.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';

const out: Record<string, Uint8Array> = {};
const add = (root: string, prefix: string) => {
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out[`${prefix}/${relative(root, p).split('\\').join('/')}`] = readFileSync(p);
    }
  };
  walk(root);
};
add(join(process.cwd(), 'dist'), 'host-a-hackathon-simulator');
out['host-a-hackathon-simulator-offline.html'] = readFileSync(join(process.cwd(), 'dist-single', 'index.html'));
const zip = zipSync(out, { level: 9 });
writeFileSync('dist.zip', zip);
console.log(`dist.zip written (${(zip.length / 1024).toFixed(1)} KB). Open host-a-hackathon-simulator-offline.html from a laptop if the venue network dies.`);
