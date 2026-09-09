import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settings = readFileSync("src/pages/CustomerSettings.jsx", "utf8");
const accountCss = readFileSync("src/pages/CustomerAccount.css", "utf8");
const drawer = readFileSync("src/components/CustomerSpace/CustomerAccountDrawer.jsx", "utf8");

test("Minha Conta não anuncia upload de foto indisponível", () => {
  assert.doesNotMatch(settings, /Foto de perfil|armazenamento seguro|customer-photo-editor/);
  assert.doesNotMatch(accountCss, /customer-photo-editor|customer-photo--static|customer-photo-crop/);
  assert.match(settings, /Nome completo/);
  assert.match(settings, /Alterar senha/);
});

test("avatar do menu da cliente permanece como identificação da conta", () => {
  assert.match(drawer, /<Avatar src=\{avatarUrl\} name=\{name\}/);
});
