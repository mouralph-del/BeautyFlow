import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const checklist = fs.readFileSync("src/components/admin/FirstAccessChecklist.jsx", "utf8");
const about = fs.readFileSync("src/pages/AdminAbout.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const sidebar = fs.readFileSync("src/components/admin/AdminSidebar.jsx", "utf8");
const layout = fs.readFileSync("src/components/admin/AdminLayout.jsx", "utf8");
const releaseNotes = fs.readFileSync("docs/Release Notes - BeautyFlow v1.0.md", "utf8");

test("checklist administrativo é local, ocultável e reabrível", () => {
  assert.match(checklist, /localStorage/);
  assert.match(checklist, /Abrir checklist de primeiro acesso/);
  assert.match(checklist, /Parabéns! Seu BeautyFlow está pronto para atender clientes\./);
  assert.doesNotMatch(checklist, /supabase|auth|fetch\(/i);
});

test("página Sobre permanece protegida e oferece documentação", () => {
  assert.match(app, /path="\/admin\/sobre" element=\{protectedAdmin/);
  assert.match(sidebar, /Sobre o BeautyFlow/);
  assert.match(about, /Versão[\s\S]*1\.0\.0/);
  assert.match(about, /Ver Changelog/);
  assert.match(about, /Abrir Manual/);
  assert.match(layout, /BeautyFlow v1\.0/);
});

test("release notes representam os módulos registrados no changelog", () => {
  assert.match(releaseNotes, /Agendamento com múltiplos serviços/);
  assert.match(releaseNotes, /RLS, RPCs transacionais/);
  assert.match(releaseNotes, /docs\/14-Changelog\.md/);
});
