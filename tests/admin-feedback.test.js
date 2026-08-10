import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/AdminFeedback.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const sidebar = fs.readFileSync("src/components/admin/AdminSidebar.jsx", "utf8");

test("feedback é protegido e permanece somente no navegador", () => {
  assert.match(app, /path="\/admin\/feedback" element=\{protectedAdmin/);
  assert.match(sidebar, /Feedback/);
  assert.match(page, /localStorage/);
  assert.doesNotMatch(page, /supabase|fetch\(|\.from\(|\.rpc\(/i);
});

test("cadastro contém campos, categorias, prioridades, autoras e status", () => {
  for (const field of ["Título", "Descrição", "Módulo", "Prioridade", "Autora", "Status"]) assert.match(page, new RegExp(field));
  for (const value of ["Área Pública", "Solicitações", "Financeiro", "Dashboard", "Outro", "Baixa", "Média", "Alta", "Aberto", "Em análise", "Resolvido", "Thaís", "Laysla"]) assert.match(page, new RegExp(value));
});

test("exportação Markdown inclui estatísticas e descarta URL temporária", () => {
  assert.match(page, /Feedback BeautyFlow\.md/);
  assert.match(page, /text\/markdown/);
  assert.match(page, /URL\.revokeObjectURL/);
  assert.match(page, /Prioridade alta/);
  assert.match(page, /Pendentes/);
});
