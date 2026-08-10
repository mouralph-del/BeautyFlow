import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/AdminHomologation.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const sidebar = fs.readFileSync("src/components/admin/AdminSidebar.jsx", "utf8");

test("homologação é administrativa, protegida e somente local", () => {
  assert.match(app, /path="\/admin\/homologacao" element=\{protectedAdmin/);
  assert.match(sidebar, /Homologação/);
  assert.match(page, /localStorage/);
  assert.doesNotMatch(page, /supabase|fetch\(|\.from\(|\.rpc\(/i);
});

test("checklist contempla os quatro grupos e três estados", () => {
  for (const heading of ["Área Pública", "Cliente", "Administração", "Automações"]) assert.match(page, new RegExp(heading));
  assert.match(page, /Aprovado/);
  assert.match(page, /Precisa ajuste/);
  assert.match(page, /Não testado/);
  assert.match(page, /Observações/);
});

test("relatório Markdown é gerado localmente e URL temporária é descartada", () => {
  assert.match(page, /text\/markdown/);
  assert.match(page, /Exportar relatório/);
  assert.match(page, /URL\.revokeObjectURL/);
  assert.match(page, /Administrador:/);
  assert.match(page, /Homologação concluída com sucesso/);
});
