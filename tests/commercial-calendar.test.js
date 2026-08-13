import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration=readFileSync("supabase/migrations/20260805200000_commercial_calendar.sql","utf8");
const manager=readFileSync("src/components/admin/HolidayManager.jsx","utf8");
const agenda=readFileSync("src/pages/AdminAgenda.jsx","utf8");
const promotions=readFileSync("src/pages/AdminPromotions.jsx","utf8");
const service=readFileSync("src/services/adminAgenda.js","utf8");

const catalog=["international_womens_day","mothers_day","valentines_day","customer_day","black_friday","christmas","new_year"];
const mothersDay=(year)=>{const first=new Date(Date.UTC(year,4,1));return new Date(Date.UTC(year,4,1+(7-first.getUTCDay())%7+7)).toISOString().slice(0,10)};
const blackFriday=(year)=>{const first=new Date(Date.UTC(year,10,1));return new Date(Date.UTC(year,10,1+(4-first.getUTCDay()+7)%7+22)).toISOString().slice(0,10)};

test("catálogo contém exatamente as sete datas obrigatórias",()=>{
 const keys=[...migration.matchAll(/\('([a-z_]+)','(?:Dia|Black|Natal|Ano)/g)].map(match=>match[1]);
 assert.deepEqual([...new Set(keys)].sort(),[...catalog].sort());
});
test("Dia da Mulher permanece em 8 de março",()=>assert.match(migration,/international_womens_day' then return make_date\(target_year,3,8\)/));
test("Dia das Mães é o segundo domingo em anos diferentes",()=>{assert.equal(mothersDay(2026),"2026-05-10");assert.equal(mothersDay(2027),"2027-05-09");assert.match(migration,/first_target\+7/)});
test("Dia dos Namorados permanece em 12 de junho",()=>assert.match(migration,/valentines_day' then return make_date\(target_year,6,12\)/));
test("Dia do Cliente permanece em 15 de setembro",()=>assert.match(migration,/customer_day' then return make_date\(target_year,9,15\)/));
test("Black Friday segue a quarta quinta-feira em anos diferentes",()=>{assert.equal(blackFriday(2026),"2026-11-27");assert.equal(blackFriday(2027),"2027-11-26");assert.match(migration,/first_target\+22/)});
test("Natal permanece em 25 de dezembro",()=>assert.match(migration,/christmas' then return make_date\(target_year,12,25\)/));
test("Ano-Novo permanece em 1º de janeiro",()=>assert.match(migration,/new_year' then return make_date\(target_year,1,1\)/));
test("geração cobre ano atual e próximo ano em São Paulo",()=>{assert.match(migration,/America\/Sao_Paulo/);assert.match(migration,/target_year in extract\(year from reference_date\)::integer\.\.extract\(year from reference_date\)::integer\+1/)});
test("datas passadas não são inseridas",()=>assert.match(migration,/if item_date>=reference_date then/));
test("geração repetida não duplica ocorrências",()=>{assert.match(migration,/holidays_commercial_key_year_unique/);assert.match(migration,/on conflict do nothing/)});
test("execução concorrente é protegida pelo índice único",()=>assert.match(migration,/create unique index[\s\S]+commercial_key,[\s\S]+extract\(year from holiday_date\)/));
test("somente o executor interno pode gerar o catálogo",()=>{assert.match(migration,/auth\.role\(\)<>'service_role'/);assert.match(migration,/grant execute on function public\.ensure_commercial_calendar\(date\) to service_role/)});
test("alertas reutilizam os marcos de 15, 7 e 2 dias",()=>assert.match(migration,/days_left=any\(array\[15,7,2\]\)/));
test("event keys separam painel e e-mail sem duplicidade",()=>{assert.match(migration,/commercial-reminder:'\|\|h\.id\|\|':'\|\|days_left/);assert.match(migration,/commercial-email:'\|\|h\.id\|\|':'\|\|days_left/)});
test("decisão e dispensa interrompem lembretes",()=>{assert.match(migration,/admin_decision='pending'/);assert.match(migration,/target_decision not in\('promotion_planned','dismissed'\)/)});
test("decisão comercial é compartilhada pelo studio",()=>{assert.match(migration,/update public\.holidays[\s\S]+admin_decision=target_decision/);assert.doesNotMatch(migration,/admin_user_id[\s\S]+admin_decision/)});
test("leitura individual existente não é redefinida",()=>assert.doesNotMatch(migration,/create or replace function public\.get_admin_notification_center|drop table.*admin_notification_reads/));
test("mensagens são contextuais às ocasiões",()=>catalog.forEach(key=>assert.match(migration,new RegExp(`when '${key}'`))));
test("e-mail é somente administrativo e respeita preferências existentes",()=>{assert.match(migration,/requires_admin_email/);assert.match(migration,/notification_preferences\(id,email_enabled,priority\)/);assert.doesNotMatch(migration,/from public\.customers|promotion_email_history/)});
test("datas comerciais não criam bloqueios nem horários especiais",()=>{assert.doesNotMatch(migration,/insert into public\.agenda_blocks|insert into public\.special_schedule_hours/);assert.match(migration,/'personalizado','commercial_catalog','pending'/)});
test("ações navegam para promoção, agenda e permitem dispensar",()=>{assert.match(manager,/>Criar promoção</);assert.match(manager,/>Revisar agenda</);assert.match(manager,/>Dispensar</);assert.match(service,/admin_decide_commercial_opportunity/);assert.match(agenda,/searchParams\.get\("view"\) === "day"/)});
test("promoção recebe somente contexto e período como rascunho",()=>{assert.match(promotions,/commercialDraft/);assert.match(promotions,/status:"draft"/);assert.match(promotions,/starts_at:`\$\{reference\}T00:00`/);assert.doesNotMatch(promotions,/commercialDraft[\s\S]{0,500}discount_value:[^"]+\d/)});
