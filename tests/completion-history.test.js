import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260804300000_notification_center_automations.sql");

test("conclusão registra responsável, horário e atividade apenas na transição", () => {
  assert.match(migration, /new\.status='concluido' and old\.status is distinct from new\.status/);
  assert.match(migration, /new\.completed_at:=coalesce\(new\.completed_at,now\(\)\)/);
  assert.match(migration, /new\.completed_by:=coalesce\(new\.completed_by,auth\.uid\(\)\)/);
  assert.match(migration, /insert into public\.request_activity/);
});

test("pós-atendimento usa completed_at sem recalcular valores financeiros", () => {
  assert.match(migration, /completed_at is not null/);
  assert.match(migration, /review_email_sent_at is null/);
  assert.doesNotMatch(migration, /record_appointment_completion[\s\S]*financial_transactions/);
});
