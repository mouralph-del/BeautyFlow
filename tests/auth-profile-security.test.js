import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("sessão Supabase usa sessionStorage e lembrar conta guarda somente e-mail", () => {
  const client = read("src/lib/supabase.js"); const auth = read("src/pages/Auth.jsx");
  assert.match(client, /sessionStorage\.getItem/); assert.doesNotMatch(client, /localStorage/);
  assert.match(auth, /beauty-studio-remembered-email/); assert.match(auth, /current-password/);
  assert.doesNotMatch(auth, /localStorage\.(setItem|getItem)\([^\n]*(password|senha)/i);
});
test("perfil próprio e preferências administrativas são protegidos no banco", () => {
  const sql = read("supabase/migrations/20260804200000_admin_preferences_customer_profile.sql");
  assert.match(sql, /where user_id=auth\.uid\(\)/i);
  assert.match(sql, /effective_email:=case when auth\.uid\(\) is null/i);
  assert.match(sql, /email_notifications_enabled boolean not null default false/i);
  assert.match(sql, /raw_app_meta_data->>'role'='admin'/i);
  assert.doesNotMatch(sql, /mouralph@gmail\.com|laysla[^\n]*@/i);
});
test("e-mail administrativo usa preferências e secret apenas como fallback", () => {
  const helper = read("supabase/functions/_shared/email.ts");
  assert.match(helper, /get_admin_email_recipients/);
  assert.match(helper, /THAIS_ADMIN_EMAIL/);
  assert.match(helper, /data\?\.length \? data :/);
});
