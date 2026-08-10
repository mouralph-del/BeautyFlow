import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("../supabase/migrations/20260804300000_notification_center_automations.sql", import.meta.url), "utf8");

test("Thaís e Laysla mantêm estados de leitura independentes", () => {
  assert.match(sql, /primary key\(notification_id,admin_user_id\)/);
  assert.match(sql, /left join public\.admin_notification_reads r on r\.notification_id=n\.id and r\.admin_user_id=auth\.uid\(\)/);
  assert.match(sql, /on conflict do nothing/);
});

test("event_key impede a mesma notificação de domínio duas vezes", () => {
  assert.match(sql, /unique index if not exists admin_notifications_event_key_unique/);
  assert.match(sql, /on conflict\(event_key\).*do nothing/s);
});
