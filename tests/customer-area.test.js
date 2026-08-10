import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("drawer da cliente possui navegação, fechamento acessível e logout oficial", () => {
  const drawer = read("src/components/CustomerSpace/CustomerAccountDrawer.jsx");
  const header = read("src/components/Header/Header.jsx");
  assert.match(drawer, /\/minha-conta\/agendamentos/);
  assert.match(drawer, /\/minha-conta\/configuracoes/);
  assert.match(drawer, /onClick=\{onClose\}/);
  assert.match(drawer, /event\.key !== "Tab"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /document\.body\.style\.overflow = "hidden"/);
  assert.match(header, /navigate\("\/entrar"\)/);
  assert.match(drawer, /name\.charAt\(0\)/);
});

test("rotas da cliente permanecem protegidas", () => {
  const app = read("src/App.jsx");
  const guard = read("src/components/auth/ProtectedRoute.jsx");
  assert.match(app, /protectedCustomer=\(page\)=><ProtectedRoute>/);
  assert.match(app, /path="\/minha-conta\/agendamentos" element=\{protectedCustomer/);
  assert.match(app, /path="\/minha-conta\/configuracoes" element=\{protectedCustomer/);
  assert.match(guard, /to="\/entrar"/);
});

test("histórico possui vazio acolhedor e controles somente quando há vários itens", () => {
  const page = read("src/pages/CustomerSpace.jsx");
  assert.match(page, /Seu primeiro momento ainda está por vir/);
  assert.match(page, /history\.length > 1/);
  assert.match(page, /Atendimento \{historyIndex \+ 1\} de \{history\.length\}/);
});

test("serviços múltiplos são agrupados em um único card por agendamento", () => {
  const card = read("src/components/CustomerSpace/CustomerAppointmentCard.jsx");
  const page = read("src/pages/CustomerAppointments.jsx");
  assert.match(card, /appointment\.services\?\.map/);
  assert.match(card, /names\.join\(" \+ "\)/);
  assert.match(page, /key=\{item\.id\}/);
});

test("configurações usam somente perfil próprio e não armazenam senha", () => {
  const page = read("src/pages/CustomerSettings.jsx");
  const profile = read("src/services/customerProfile.js");
  assert.match(profile, /get_own_customer_profile/);
  assert.match(profile, /save_own_customer_profile/);
  assert.match(page, /PasswordInput/);
  assert.match(page, /updatePassword\(password\)/);
  assert.doesNotMatch(page, /(localStorage|sessionStorage|document\.cookie)[\s\S]{0,100}(password|senha)/i);
  assert.doesNotMatch(page, /EXCLUIR|Salvar preferências/);
});
