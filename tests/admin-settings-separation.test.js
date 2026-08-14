import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("configurações da ADM contêm somente conta, preferências próprias e segurança", () => {
  const page = read("src/pages/AdminSettings.jsx");
  assert.match(page, /const adminTabs = \[\["account", "Minha conta"[\s\S]*\["preferences", "Minhas preferências"[\s\S]*\["security", "Segurança"/);
  assert.match(page, /mode === "site" \? siteTabs : adminTabs/);
  assert.match(page, /admin_user_id === user\?\.id/);
  assert.match(page, /saveAdminPreference\(user\.id/);
  assert.match(page, /saveAdminDailyPreference\(user\.id/);
});

test("nome, e-mail e senha da ADM usam exclusivamente o Auth oficial", () => {
  const page = read("src/pages/AdminSettings.jsx");
  const service = read("src/services/settings.js");
  assert.match(page, /updateAdminProfile\(form\.account\)/);
  assert.match(service, /supabase\.auth\.updateUser\(\{ data: \{ name: name\.trim\(\) \} \}\)/);
  assert.match(service, /supabase\.auth\.updateUser\(\{ email: email\.trim\(\) \}\)/);
  assert.match(service, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.doesNotMatch(service, /auth\.users/);
});

test("configurações do site concentram somente seções globais existentes", () => {
  const page = read("src/pages/AdminSettings.jsx");
  assert.match(page, /const siteTabs = \[[\s\S]*Perfil do estúdio[\s\S]*Agenda e horários[\s\S]*Pagamentos e Pix[\s\S]*Políticas[\s\S]*Comunicação e e-mails[\s\S]*\["site", "Site"[\s\S]*Administradores/);
  const adminsSection = page.slice(page.indexOf("function AdminsSection"), page.indexOf("function SettingsSection"));
  assert.doesNotMatch(adminsSection, /panel_notifications_enabled|email_notifications_enabled|show_daily_verse/);
});

test("full_address permanece no private_data e fora da configuração pública", () => {
  const page = read("src/pages/AdminSettings.jsx");
  const service = read("src/services/settings.js");
  const migration = read("supabase/migrations/20260801200000_admin_settings.sql");
  assert.match(page, /form\.payments\.full_address/);
  assert.match(page, /update\("payments","full_address"/);
  assert.match(migration, /private_data->|private_data jsonb|private_data/);
  assert.match(migration, /get_public_settings\(\)[\s\S]*public_data/);
  assert.doesNotMatch(service.slice(service.indexOf("DEFAULT_PUBLIC_SETTINGS"), service.indexOf("let publicSettingsCache")), /full_address/);
});

test("rotas e sidebar distinguem conta da ADM e configurações do site", () => {
  const app = read("src/App.jsx");
  const sidebar = read("src/components/admin/AdminSidebar.jsx");
  assert.match(app, /path="\/admin\/configuracoes" element=\{protectedAdmin\(<AdminSettings\/>\)\}/);
  assert.match(app, /path="\/admin\/configuracoes-site" element=\{protectedAdmin\(<AdminSiteSettings\/>\)\}/);
  assert.match(sidebar, /Minha conta[\s\S]*\/admin\/configuracoes/);
  assert.match(sidebar, /Configurações do site[\s\S]*\/admin\/configuracoes-site/);
});
