import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { getSignUpError, isStrongRegistrationPassword, isValidRegistrationEmail, SIGN_UP_MESSAGES } from "../src/services/authRegistrationRules.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const authPage = read("src/pages/Auth.jsx");
const registration = read("src/services/authRegistration.js");

test("cadastro válido não pede confirmação de e-mail", () => {
  assert.match(authPage, /Conta criada com sucesso!/);
  assert.doesNotMatch(authPage, /confirme.*e-mail|verifique.*caixa/i);
});

test("sessão automática mostra sucesso e redireciona cliente", () => {
  assert.match(authPage, /if \(!data\.session\?\.user\)/);
  assert.match(authPage, /setCompletedUser\(data\.session\.user\)/);
  assert.match(authPage, /role === "admin" \? "\/admin" : "\/minha-conta"/);
});

test("e-mail já cadastrado recebe tela e ações seguras", () => {
  assert.deepEqual(getSignUpError({ code: "user_already_exists" }), { type: "existing-account", field: "email" });
  assert.match(authPage, /Este e-mail já possui uma conta/);
  assert.match(authPage, /Recuperar senha/);
});

test("e-mail inválido e senha fraca são validados", () => {
  assert.equal(isValidRegistrationEmail("invalido"), false);
  assert.equal(isValidRegistrationEmail("cliente@example.com"), true);
  assert.equal(isStrongRegistrationPassword("somentesenha"), false);
  assert.equal(isStrongRegistrationPassword("Senha123"), true);
  assert.equal(SIGN_UP_MESSAGES.weakPassword, "Crie uma senha com pelo menos 8 caracteres, uma letra e um número.");
});

test("clique duplicado é bloqueado e mantém formulário", () => {
  assert.match(authPage, /if \(submitting\) return/);
  assert.match(authPage, /<button disabled=\{submitting\}>/);
  assert.doesNotMatch(authPage, /setFormData\([^)]*\{\s*name:\s*""/s);
});

test("falha de conexão e erro desconhecido nunca expõem objetos", () => {
  assert.equal(getSignUpError({ message: "Failed to fetch" }).message, SIGN_UP_MESSAGES.network);
  assert.equal(getSignUpError({ message: {} }).message, SIGN_UP_MESSAGES.unknown);
  assert.equal(getSignUpError({}).message, SIGN_UP_MESSAGES.unknown);
  assert.doesNotMatch(authPage, /setError\(authError|JSON\.stringify\(authError|authError\.message/);
});

test("cadastro público não escolhe role administrativo", () => {
  assert.doesNotMatch(registration, /role\s*:/);
  assert.doesNotMatch(registration, /app_metadata/);
});

test("recuperação e troca de e-mail preservam APIs oficiais", () => {
  const recovery = read("src/services/passwordRecovery.js");
  const settings = read("src/services/settings.js");
  assert.match(recovery, /resetPasswordForEmail/);
  assert.match(settings, /updateUser\(\{ email: email\.trim\(\) \}\)/);
});
