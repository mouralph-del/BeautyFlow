import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260804800000_automation_hardening.sql", "utf8");
const worker = readFileSync("supabase/functions/_shared/email.ts", "utf8");
const automatedFunctions = ["reminders", "daily-summary", "promotion-mailer"]
  .map((name) => readFileSync(`supabase/functions/${name}/index.ts`, "utf8"));

test("workers automáticos exigem segredo exclusivo", () => {
  assert.match(worker, /AUTOMATION_CRON_SECRET/);
  assert.match(worker, /x-beautyflow-automation-secret/);
  for (const source of automatedFunctions) assert.match(source, /requireAutomationRequest\(request\)/);
});

test("scheduler envia o segredo sem usar service role no Vault", () => {
  assert.match(migration, /beautyflow_automation_cron_secret/);
  assert.match(migration, /'x-beautyflow-automation-secret',automation_secret/);
  const invocation = migration.slice(0, migration.indexOf("-- Uma transição"));
  assert.doesNotMatch(invocation, /service_role_key/i);
});

test("Resend recebe idempotency key oficial", () => {
  assert.match(worker, /"Idempotency-Key": eventKey\.slice\(0, 256\)/);
});

test("mudança de pagamento suprime comunicação redundante de status", () => {
  assert.match(migration, /payment_changed:=true/);
  assert.match(migration, /new\.status is distinct from old\.status and not payment_changed/);
});

test("mailer promocional usa somente o modelo atual", () => {
  const promotion = migration.slice(migration.indexOf("create or replace function public.prepare_promotion_emails"), migration.indexOf("create or replace function public.expire_unpaid_reservations"));
  assert.match(promotion, /status='active' and email_enabled/);
  assert.match(promotion, /p\.short_description/);
  assert.match(promotion, /p\.button_target/);
  assert.doesNotMatch(promotion, /where active\b|p\.description|p\.link/);
});

test("prazo de comprovante existente possui executor seguro", () => {
  assert.match(migration, /private_data->>'proof_deadline_minutes'/);
  assert.match(migration, /~ '\^\\d\+\$'/);
  assert.match(migration, /payment_proof is null/);
  assert.match(migration, /status in\('aguardando_pagamento','aguardando_comprovante'\)/);
  assert.match(migration, /grant execute on function public\.expire_unpaid_reservations\(\) to service_role/);
});

test("executor horário inicializa o versículo sem depender do painel", () => {
  assert.match(migration, /perform public\.select_daily_verse\(local_today,'morning'\)/);
});
