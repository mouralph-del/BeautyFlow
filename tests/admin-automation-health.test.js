import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260910140000_refine_admin_automation_health.sql", "utf8");
const service = readFileSync("src/services/adminDashboard.js", "utf8");
const dashboard = readFileSync("src/pages/AdminDashboard.jsx", "utf8");
const status = (items, now = new Date("2026-08-14T12:00:00Z")) => ({
  recent_failed_count: items.filter((item) => item.status === "failed" && now - new Date(item.updated_at || item.created_at) <= 24 * 60 * 60_000).length,
  stuck_processing_count: items.filter((item) => item.status === "processing" && now - new Date(item.locked_at || item.updated_at || item.created_at) > 15 * 60_000).length,
  stale_pending_count: items.filter((item) => item.status === "pending" && now - new Date(item.next_attempt_at || item.created_at) > 75 * 60_000).length,
});
const hasAlert = (value) => Object.values(value).some((count) => count > 0);

test("sem falhas recentes não mostra alerta", () => {
  assert.equal(hasAlert(status([])), false);
});

test("falha das últimas 24 horas mostra alerta", () => {
  assert.deepEqual(status([{ status: "failed", updated_at: "2026-08-14T11:50:00Z" }]).recent_failed_count, 1);
});

test("falhas históricas não viram incidente atual", () => {
  const historical = Array.from({ length: 10 }, () => ({ status: "failed", updated_at: "2026-08-11T10:00:00Z" }));
  assert.equal(hasAlert(status(historical)), false);
});

test("processing acima de quinze minutos alerta e recente não alerta", () => {
  assert.equal(status([{ status: "processing", locked_at: "2026-08-14T11:44:00Z" }]).stuck_processing_count, 1);
  assert.equal(status([{ status: "processing", locked_at: "2026-08-14T11:46:00Z" }]).stuck_processing_count, 0);
});

test("pending dentro da janela normal não alerta e vencido alerta", () => {
  assert.equal(status([{ status: "pending", next_attempt_at: "2026-08-14T11:00:00Z" }]).stale_pending_count, 0);
  assert.equal(status([{ status: "pending", next_attempt_at: "2026-08-14T10:44:00Z" }]).stale_pending_count, 1);
});

test("múltiplas condições mantêm contagens independentes", () => {
  assert.deepEqual(status([
    { status: "failed", updated_at: "2026-08-14T11:00:00Z" },
    { status: "processing", locked_at: "2026-08-14T11:00:00Z" },
    { status: "pending", next_attempt_at: "2026-08-14T10:44:00Z" },
  ]), { recent_failed_count: 1, stuck_processing_count: 1, stale_pending_count: 1 });
});

test("RPC retorna somente agregados e bloqueia não-admin", () => {
  assert.match(migration, /if not public\.is_admin\(\) then raise exception/);
  assert.match(migration, /recent_failed_count/);
  assert.match(migration, /stuck_processing_count/);
  assert.match(migration, /stale_pending_count/);
  assert.match(migration, /last_failure_at/);
  assert.doesNotMatch(migration, /jsonb_build_object\([\s\S]*?'recipient'|jsonb_build_object\([\s\S]*?'subject'|jsonb_build_object\([\s\S]*?'body'|jsonb_build_object\([\s\S]*?'payload'|jsonb_build_object\([\s\S]*?'provider_message_id'/);
});

test("Dashboard não quebra se o RPC falhar e só renderiza incidentes", () => {
  assert.match(service, /get_admin_automation_health/);
  assert.match(service, /return null/);
  assert.match(dashboard, /data\.operationalStatus &&/);
  assert.match(dashboard, /As automações precisam de atenção/);
});

test("monitoramento não cria e-mail nem respeita preferência comum do painel", () => {
  assert.doesNotMatch(migration, /enqueue_automation_email|email_delivery_logs|notification_preferences|panel_notifications_enabled/);
  assert.doesNotMatch(dashboard, /sendTemplateEmail|processOutbox/);
});
