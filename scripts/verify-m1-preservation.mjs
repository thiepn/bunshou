import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const base='8a1735a52fa56bdd5c11609828644b9d19d1e15b';
const frozen=['src/components/StudyView.tsx','src/utils/srs.ts','src/utils/linguistics.ts','src/types/curriculum.ts','src/data/sentences.ts','src/data/sentences.test.ts','src/data/sentencesA11Part1.ts','src/data/sentencesA11Part2.ts','src/data/sentencesA12Part1.ts','src/data/sentencesA12Part2.ts','src/data/units.ts','src/data/dialogues.ts','src/data/referenceData.ts','src/utils/furigana.ts'];
const hash=p=>{const b=readFileSync(p);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
for(const p of frozen){const expected=execFileSync('git',['rev-parse',base+':'+p],{encoding:'utf8'}).trim();if(hash(p)!==expected)throw Error('Frozen source altered: '+p);}
const sdk={'LICENSE':'7a3093d3cfdeb453457189c3b46f5cd594f1daab','package.json':'a0cb26f238960c7c543cd9b64877a89625337528','src/index.ts':'ae0a99369476b2d114de4b57528e212b460bb551','src/browser-sso.ts':'30dd645a93955671021e24d8999c2988a5303e34'};
for(const [p,h] of Object.entries(sdk))if(hash('vendor/account-session/'+p)!==h)throw Error('SDK changed: '+p);
console.log('Frozen sources '+frozen.length+'/'+frozen.length+' and SDK 4/4 verified');
