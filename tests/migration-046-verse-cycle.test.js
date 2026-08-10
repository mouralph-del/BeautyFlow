import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql=readFileSync("supabase/migrations/20260804600000_admin_daily_experience.sql","utf8");
function selector(items){let clock=0;const choices=new Map();return(date,period)=>{const key=`${date}:${period}`;if(choices.has(key))return choices.get(key);const active=items.filter((item)=>item.active);const usedToday=new Set([...choices].filter(([choice])=>choice.startsWith(`${date}:`)).map(([,id])=>id));const candidates=active.length===1?active:active.filter((item)=>!usedToday.has(item.id));candidates.sort((a,b)=>(a.used??-1)-(b.used??-1)||a.id-b.id);const selected=candidates[0]||active.sort((a,b)=>(a.used??-1)-(b.used??-1)||a.id-b.id)[0];if(!selected)return null;selected.used=clock++;choices.set(key,selected.id);return selected.id;};}

test("mesma data e manhã retorna o mesmo versículo",()=>{const pick=selector([{id:1,active:true},{id:2,active:true}]);assert.equal(pick("2026-08-10","morning"),pick("2026-08-10","morning"));});
test("mesma data e encerramento retorna o mesmo versículo",()=>{const pick=selector([{id:1,active:true},{id:2,active:true}]);assert.equal(pick("2026-08-10","closing"),pick("2026-08-10","closing"));});
test("manhã e encerramento são diferentes",()=>{const pick=selector([{id:1,active:true},{id:2,active:true}]);assert.notEqual(pick("2026-08-10","morning"),pick("2026-08-10","closing"));});
test("dia seguinte não repete enquanto existem opções não usadas",()=>{const pick=selector([{id:1,active:true},{id:2,active:true},{id:3,active:true}]);const first=pick("2026-08-10","morning");assert.notEqual(first,pick("2026-08-11","morning"));});
test("N usos consomem N conteúdos antes de repetir",()=>{const pick=selector([1,2,3,4].map((id)=>({id,active:true})));const values=[1,2,3,4].map((day)=>pick(`2026-08-${day+9}`,"morning"));assert.equal(new Set(values).size,4);});
test("ciclo reinicia somente depois de esgotar ativos",()=>{const pick=selector([1,2].map((id)=>({id,active:true})));const values=[10,11,12].map((day)=>pick(`2026-08-${day}`,"morning"));assert.deepEqual(values,[1,2,1]);});
test("conteúdo inativo nunca é escolhido",()=>{const pick=selector([{id:1,active:false},{id:2,active:true}]);assert.equal(pick("2026-08-10","morning"),2);});
test("concorrência é serializada e a escolha tem chave única",()=>{assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/primary key\(local_date,period\)/);assert.match(sql,/on conflict\(local_date,period\) do nothing/);});
test("timezone de São Paulo permanece explícito",()=>assert.match(sql,/America\/Sao_Paulo/));
test("uma única opção ativa funciona como fallback",()=>{const pick=selector([{id:7,active:true}]);assert.equal(pick("2026-08-10","morning"),7);assert.equal(pick("2026-08-10","closing"),7);});
test("overflow do hash foi removido",()=>{assert.doesNotMatch(sql,/abs\s*\(\s*hashtext|hashtext\s*\(/i);});
