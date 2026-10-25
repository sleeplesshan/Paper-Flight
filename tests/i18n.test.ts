import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import {translate,readLanguage} from '../src/i18n';
import {japanese} from '../src/locales/ja';
test('Korean copy is unchanged and every Japanese dictionary entry is translated',()=>{for(const [ko,ja]of Object.entries(japanese)){assert.equal(translate(ko,'ko'),ko);assert.equal(translate(ko,'ja'),ja);assert.ok(!/[가-힣]/.test(ja),ko)}});
test('every static Korean message and template fragment has Japanese coverage',()=>{const missing:string[]=[];for(const f of fs.readdirSync('src').filter(f=>f.endsWith('.ts'))){if(f==='i18n.ts')continue;const sf=ts.createSourceFile(f,fs.readFileSync('src/'+f,'utf8'),ts.ScriptTarget.Latest,true);const visit=(n:ts.Node)=>{if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&/[가-힣]/.test(n.text)&&!n.text.includes('data-language')){const result=translate(n.text,'ja');if(/[가-힣]/.test(result))missing.push(f+': '+result)}ts.forEachChild(n,visit)};visit(sf)}assert.deepEqual(missing,[])});
test('translation preserves markup, numbers and punctuation',()=>{assert.equal(translate('<h2>이번 모험</h2><b>123점</b>','ja'),'<h2>今回の冒険</h2><b>123点</b>');assert.equal(readLanguage(),'ko')});
