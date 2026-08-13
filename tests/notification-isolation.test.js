import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("../supabase/migrations/20260804300000_notification_center_automations.sql", import.meta.url), "utf8");
const individualReads = fs.readFileSync(new URL("../supabase/migrations/20260805000000_individual_admin_notification_reads.sql", import.meta.url), "utf8");
const dashboardService = fs.readFileSync(new URL("../src/services/adminDashboard.js", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../src/pages/AdminDashboard.jsx", import.meta.url), "utf8");

test("Thaís e Laysla mantêm estados de leitura independentes", () => {
  assert.match(sql, /primary key\(notification_id,admin_user_id\)/);
  assert.match(sql, /left join public\.admin_notification_reads r on r\.notification_id=n\.id and r\.admin_user_id=auth\.uid\(\)/);
  assert.match(sql, /on conflict do nothing/);
});

test("event_key impede a mesma notificação de domínio duas vezes", () => {
  assert.match(sql, /unique index if not exists admin_notifications_event_key_unique/);
  assert.match(sql, /on conflict\(event_key\).*do nothing/s);
});

test("Dashboard reutiliza a central e abandona read_at global", () => {
  assert.match(dashboardService, /getNotificationCenter\(\)/);
  assert.doesNotMatch(dashboardService, /from\("admin_notifications"\)/);
  assert.doesNotMatch(dashboard, /notification\.read_at/);
  assert.match(dashboard, /notificationUnreadCount/);
});

test("duas administradoras leem a mesma notificação independentemente", () => {
  const reads = new Set();
  const key = (admin, notification) => `${admin}:${notification}`;
  const isRead = (admin, notification) => reads.has(key(admin, notification));

  assert.equal(isRead("admin-a", 1), false);
  assert.equal(isRead("admin-b", 1), false);
  reads.add(key("admin-a", 1));
  assert.equal(isRead("admin-a", 1), true);
  assert.equal(isRead("admin-b", 1), false);
  reads.add(key("admin-b", 1));
  assert.equal(isRead("admin-a", 1), true);
  assert.equal(isRead("admin-b", 1), true);
});

test("contagem e itens usam auth.uid e leitura individual", () => {
  assert.match(individualReads, /r\.admin_user_id=auth\.uid\(\)/);
  assert.match(individualReads, /\(r\.read_at is not null\) is_read/);
  assert.match(individualReads, /'unread_count'/);
  assert.match(dashboard, /!notification\.is_read/);
});

test("preferência de painel desativada retorna central vazia sem afetar e-mail", () => {
  assert.match(individualReads, /p\.is_active and p\.panel_notifications_enabled/);
  assert.match(individualReads, /return jsonb_build_object\('unread_count',0,'items','\[\]'::jsonb\)/);
  assert.match(individualReads, /from public\.admin_notification_preferences p/);
  assert.doesNotMatch(individualReads, /email_notifications_enabled|automation_email_outbox|email_delivery_logs/);
});

test("campo legado read_at permanece preservado por compatibilidade", () => {
  assert.doesNotMatch(individualReads, /drop column|drop table|update public\.admin_notifications/);
  assert.match(sql, /admin_notification_reads/);
});
