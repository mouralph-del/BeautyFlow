import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("logo mobile reduz o conteúdo interno sem remover Beauty Studio", () => {
  const headerCss = read("src/components/Header/Header.css");
  const logo = read("src/components/BrandLogo/BrandLogo.jsx");
  assert.match(headerCss, /@media \(max-width: 650px\)[\s\S]*--brand-logo-width: 126px/);
  assert.match(headerCss, /--brand-studio-size: 6px/);
  assert.match(logo, /Beauty Studio/);
});

test("cliente autenticada usa somente o drawer no mobile", () => {
  const header = read("src/components/Header/Header.jsx");
  const headerCss = read("src/components/Header/Header.css");
  assert.match(header, /user && !isAdmin \? " header--customer"/);
  assert.match(header, /\(!user \|\| isAdmin\) && <button[^>]+header-menu-button/);
  assert.match(headerCss, /\.header--customer \.header__nav\{display:none\}/);
});

test("drawer reúne conta e todos os destinos do antigo menu público", () => {
  const drawer = read("src/components/CustomerSpace/CustomerAccountDrawer.jsx");
  for (const route of ["/minha-conta", "/minha-conta/agendamentos", "/minha-conta/configuracoes", "/", "/servicos", "/minha-historia", "/galeria", "/contato"]) {
    assert.match(drawer, new RegExp(`to="${route.replaceAll("/", "\\/")}"`));
  }
  assert.equal((drawer.match(/onClick=\{onClose\}/g) ?? []).length >= 9, true);
  assert.match(drawer, /onClick=\{onSignOut\}/);
});

test("inputs do Booking usam 16px no mobile sem bloquear zoom acessível", () => {
  const bookingCss = read("src/pages/Booking.css");
  const authCss = read("src/pages/Auth.css");
  const html = read("index.html");
  assert.match(bookingCss, /@media \(max-width: 760px\)[\s\S]*\.booking__customer input,[\s\S]*font-size: 16px/);
  assert.match(authCss, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\) \{ font-size:16px; \}/);
  assert.match(html, /width=device-width, initial-scale=1\.0/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/i);
});

test("drawer preserva scroll lock com cleanup e navegação interna rolável", () => {
  const drawer = read("src/components/CustomerSpace/CustomerAccountDrawer.jsx");
  const headerCss = read("src/components/Header/Header.css");
  assert.match(drawer, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(drawer, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(headerCss, /\.customer-drawer nav\{[^}]*overflow-y:auto/);
});
