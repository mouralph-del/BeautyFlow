import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const dashboard = read("src/pages/AdminDashboard.jsx");
const header = read("src/components/admin/AdminHeader.jsx");
const notificationCenter = read("supabase/migrations/20260804300000_notification_center_automations.sql");
const individualReads = read("supabase/migrations/20260805000000_individual_admin_notification_reads.sql");

test("central preserva leitura individual e atualização do contador", () => {
  assert.match(header, /await markNotificationRead\(item\.id\)/);
  assert.match(header, /await load\(\)/);
  assert.match(header, /unread_count:fallbackCount/);
  assert.match(individualReads, /r\.admin_user_id=auth\.uid\(\)/);
  assert.match(notificationCenter, /on conflict do nothing/);
});

test("Dashboard não duplica a central de notificações", () => {
  assert.doesNotMatch(dashboard, /AdminNotifications/);
  assert.doesNotMatch(dashboard, /Detalhes da notificação/);
  assert.match(dashboard, /getAdminDashboardData/);
  assert.match(dashboard, /notificationUnreadCount/);
});

test("fase não apaga nem altera o histórico de notificações", () => {
  assert.doesNotMatch(dashboard, /delete\(|\.delete\(\)/i);
  assert.doesNotMatch(header, /delete\(|\.delete\(\)/i);
  assert.match(notificationCenter, /admin_notification_reads/);
});
