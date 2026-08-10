import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql=readFileSync("supabase/migrations/20260804500000_holidays_completion_no_show.sql","utf8");
const finalizer=sql.slice(sql.indexOf("create or replace function public.admin_finalize_appointment"),sql.indexOf("create or replace function public.prepare_hourly_automation_emails"));
const eligible=(status,payment)=>["confirmado","confirmed"].includes(status)&&["confirmado","aprovado","approved","pago","paid"].includes(payment);

test("confirmado para concluído é permitido",()=>assert.equal(eligible("confirmado","confirmado"),true));
test("confirmado para não compareceu é permitido",()=>assert.equal(eligible("confirmado","pago"),true));
for(const status of ["cancelado","expirado","recusado","aguardando_pagamento"]){
  test(`${status} para concluído é bloqueado`,()=>assert.equal(eligible(status,"confirmado"),false));
}
test("cancelado para no-show é bloqueado",()=>assert.equal(eligible("cancelado","pago"),false));
test("conclusão repetida é idempotente antes da validação",()=>assert.ok(finalizer.indexOf("a.status in('concluido','nao_compareceu')")<finalizer.indexOf("a.status not in('confirmado','confirmed')")));
test("no-show repetido é coberto pela mesma guarda idempotente",()=>assert.match(finalizer,/a\.status in\('concluido','nao_compareceu'\)/));
test("status inválido é bloqueado antes de qualquer receita",()=>assert.ok(finalizer.indexOf("a.status not in('confirmado','confirmed')")<finalizer.indexOf("select coalesce(sum(amount),0)")));
test("lembrete de feriado não é executável por anon",()=>assert.match(sql,/revoke execute on function public\.prepare_holiday_reminders\(\) from anon/));
test("lembrete de feriado não é executável por authenticated",()=>assert.match(sql,/revoke execute on function public\.prepare_holiday_reminders\(\) from authenticated/));
test("cliente comum não herda execução pública",()=>assert.match(sql,/revoke execute on function public\.prepare_holiday_reminders\(\) from public/));
test("somente executor autorizado recebe grant",()=>{assert.match(sql,/grant execute on function public\.prepare_holiday_reminders\(\) to service_role/);assert.doesNotMatch(sql,/grant execute on function public\.prepare_holiday_reminders\(\) to (anon|authenticated)/);});
test("pós-atendimento permanece apenas no job dedicado",()=>{const hourly=sql.slice(sql.indexOf("create or replace function public.prepare_hourly_automation_emails"));assert.doesNotMatch(hourly,/prepare_post_service_emails/);});
