import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260910130000_secure_admin_cancellation.sql", "utf8");
const overlapGuard = readFileSync("supabase/migrations/20260803190000_appointment_overlap_guard.sql", "utf8");
const agenda = readFileSync("src/pages/AdminAgenda.jsx", "utf8");
const service = readFileSync("src/services/adminAgenda.js", "utf8");

test("cancelamento administrativo usa RPC transacional e registra auditoria", () => {
  assert.match(migration, /create or replace function public\.cancel_admin_appointment/);
  assert.match(migration, /security definer/);
  assert.match(migration, /if not public\.is_admin\(\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /cancelled_by_user_id uuid/);
  assert.match(migration, /cancelled_by_user_id = auth\.uid\(\)/);
  assert.match(migration, /cancelled_by = 'admin'/);
  assert.match(migration, /cancelled_at = cancellation_time/);
  assert.match(migration, /reason = normalized_reason/);
});

test("regras administrativas bloqueiam estados e pagamento em análise", () => {
  assert.match(migration, /status = 'cancelado'/);
  assert.match(migration, /status in \('concluido', 'nao_compareceu'\)/);
  assert.match(migration, /at time zone 'America\/Sao_Paulo' <= now\(\)/);
  assert.match(migration, /payment_status = 'em_analise'/);
  assert.match(migration, /Informe o motivo do cancelamento/);
});

test("cancelamento preserva financeiro, serviços e não cria reembolso", () => {
  const update = migration.slice(migration.indexOf("update public.appointments"), migration.indexOf("select coalesce(string_agg"));
  assert.doesNotMatch(update, /payment_status\s*=/);
  assert.doesNotMatch(update, /reservation_paid\s*=/);
  assert.doesNotMatch(migration, /refund|reembolso|financial_transactions\s+set/i);
  assert.match(migration, /appointment_services/);
  assert.match(overlapGuard, /if new\.status = 'cancelado' then return new/);
});

test("cancelamento envia motivo à cliente e não cria admin_cancellation para ação administrativa", () => {
  assert.match(migration, /'cancellation_reason', coalesce/);
  assert.match(migration, /Motivo informado:<\/strong> \{\{cancellation_reason\}\}/);
  assert.match(migration, /coalesce\(new\.cancelled_by, ''\) <> 'admin'/);
  assert.match(migration, /'admin-cancellation:' \|\| new\.id/);
  assert.match(migration, /in \('cliente_area', 'cliente_link_email'\)/);
  assert.match(migration, /'appointment-cancelled:' \|\| new\.id/);
});

test("frontend exige motivo, evita duplo clique e só atualiza após RPC", () => {
  assert.match(service, /supabase\.rpc\("cancel_admin_appointment"/);
  assert.match(service, /if \(!data\) throw new Error/);
  assert.match(agenda, /Motivo do cancelamento/);
  assert.match(agenda, /required rows="4"/);
  assert.match(agenda, /disabled=\{saving\|\|!cancellationReason\.trim\(\)\}/);
  assert.match(agenda, /await cancelAdminAppointment\(\{appointmentId:selected\.id,reason\}\)/);
  assert.doesNotMatch(agenda, /updateAppointment\(selected\.id,\{status:"cancelado"/);
});
