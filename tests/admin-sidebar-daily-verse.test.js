import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sidebar = readFileSync("src/components/admin/AdminSidebar.jsx", "utf8");
const dailyExperience = readFileSync("src/components/admin/DailyExperience.jsx", "utf8");
const dashboardService = readFileSync("src/services/adminDashboard.js", "utf8");
const dailyMigration = readFileSync("supabase/migrations/20260804600000_admin_daily_experience.sql", "utf8");

test("sidebar não possui versículo fixo independente", () => {
  assert.doesNotMatch(sidebar, /O Senhor é o meu pastor|Salmos 23:1|VerseCard|verse-card/);
});

test("conteúdo diário correto permanece vindo da experiência administrativa", () => {
  assert.match(dashboardService, /get_admin_daily_experience/);
  assert.match(dashboardService, /dailyVerse: dailyExperience\?\.morning_verse/);
  assert.match(dailyExperience, /data\.dailyVerse\.text/);
  assert.match(dailyExperience, /data\.dailyVerse\.reference/);
});

test("preferência individual desabilitada oculta o versículo diário", () => {
  assert.match(dailyExperience, /preferences\.show_daily_verse !== false && data\.dailyVerse/);
  assert.match(dailyMigration, /admin_user_id=auth\.uid\(\)/);
  assert.match(dailyMigration, /show_daily_verse/);
});

test("navegação do sidebar permanece completa", () => {
  for (const route of ["/admin", "/admin/agenda", "/admin/solicitacoes", "/admin/clientes", "/admin/servicos", "/admin/promocoes", "/admin/galeria", "/admin/financeiro", "/", "/admin/configuracoes", "/admin/sobre"]) {
    assert.match(sidebar, new RegExp(`to: "${route.replaceAll("/", "\\/")}"`));
  }
  assert.match(sidebar, /onClick=\{onClose\}/);
});
