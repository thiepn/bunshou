// Build-only release packaging. No network, credentials or deployment.
import {cpSync,mkdirSync,readFileSync,writeFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dist=resolve('dist'),out=resolve('release-static'),app=join(out,'bunshou');
if(existsSync(out))throw Error('Remove or archive prior release-static first');
const html=readFileSync(join(dist,'index.html'),'utf8');
if(!html.includes('/bunshou/assets/'))throw Error('Expected /bunshou/ build');
const manifest=JSON.parse(readFileSync(join(dist,'manifest.webmanifest'),'utf8'));
if(manifest.scope!=='/bunshou/'||manifest.start_url!=='/bunshou/')throw Error('PWA scope mismatch');
mkdirSync(out);cpSync(dist,app,{recursive:true});
mkdirSync(join(app,'auth/callback'),{recursive:true});writeFileSync(join(app,'auth/callback/index.html'),html);
writeFileSync(join(out,'_headers'),'/bunshou/auth/callback/\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n/bunshou/sw.js\n  Cache-Control: no-cache\n/bunshou/index.html\n  Cache-Control: no-cache\n/bunshou/\n  Cache-Control: no-cache\n');
const paths=[];
function walk(dir){for(const n of readdirSync(dir).sort()){const p=join(dir,n);if(statSync(p).isDirectory())walk(p);else paths.push(p);}}
walk(out);
for(const path of paths){if(/\.(?:map|env)$/i.test(path))throw Error('Unexpected private build artifact: '+path);}
const metadata={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base:'/bunshou/',cloudSync:false,files:paths.map(p=>({path:relative(out,p).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')}))};
writeFileSync(join(out,'release-manifest.json'),JSON.stringify(metadata,null,2)+'\n');
console.log('Packaged '+paths.length+' static files, callback and SHA-256 manifest; no deployment');
