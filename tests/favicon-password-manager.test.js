import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("favicon usa TS lado a lado e mantém o título Beauty Studio", () => {
  const html = read("index.html");
  const source = read("public/favicon-source.svg");
  assert.match(html, /<title>Beauty Studio<\/title>/);
  for (const size of [16, 32, 48]) assert.match(html, new RegExp(`favicon-${size}x${size}\\.png`));
  assert.match(html, /favicon\.ico/);
  assert.match(source, />TS<\/text>/);
  assert.doesNotMatch(html, /vite\.svg|favicon\.png/);
});

test("cadastro reduz sugestão sem hacks e login preserva autocomplete", () => {
  const auth = read("src/pages/Auth.jsx");
  const passwordInput = read("src/components/PasswordInput/PasswordInput.jsx");
  assert.match(auth, /autoComplete=\{isSignUp \? "off" : "on"\}/);
  assert.match(auth, /autoComplete=\{isSignUp \? "off" : "current-password"\}/);
  assert.match(auth, /autoComplete=\{isSignUp \? "email" : "username"\}/);
  assert.match(auth, /autoCapitalize=\{isSignUp \? "none" : "off"\}/);
  assert.match(auth, /spellCheck=\{false\}/);
  assert.match(passwordInput, /type=\{showPassword \? "text" : "password"\}/);
  assert.doesNotMatch(auth, /type="hidden"|onPaste=|preventDefault\(\).*paste/i);
});

test("recuperação e configurações mantêm semântica de nova senha", () => {
  assert.match(read("src/pages/RecoverPassword.jsx"), /autoComplete="username"/);
  assert.match(read("src/pages/NewPassword.jsx"), /autoComplete="new-password"/);
  assert.match(read("src/pages/CustomerSettings.jsx"), /autoComplete="new-password"/);
});
