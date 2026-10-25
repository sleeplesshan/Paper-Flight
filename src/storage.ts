import {t as localize,msg} from './i18n';
import {normalizeMedalSave} from './medals';
import {initialSave,normalizeRun,type Save} from './data';
export const KEY='yujun-paper-flight-v1';
export function load():Save{try{const raw=localStorage.getItem(KEY);if(!raw)return initialSave();const v=JSON.parse(raw);if(![1,2,3,4].includes(v.version)||!Array.isArray(v.gems)||!Number.isFinite(v.remaining))throw Error(localize('저장 형식을 읽을 수 없습니다'));return normalizeMedalSave({...initialSave(),...v,version:4,run:v.run?normalizeRun(v.run):null,remaining:Math.max(0,v.remaining)},v.version<3)}catch{throw Error(localize('저장한 기록을 읽을 수 없어요. 보호자에게 알려주세요.'))}}
export function persist(s:Save){localStorage.setItem(KEY,JSON.stringify(s))}
