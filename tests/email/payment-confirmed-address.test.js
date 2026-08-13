import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPaymentConfirmedAddress } from "../../supabase/functions/_shared/email-template.js";

const worker = readFileSync("supabase/functions/_shared/email.ts", "utf8");
const settingsService = readFileSync("src/services/settings.js", "utf8");
const settingsMigration = readFileSync("supabase/migrations/20260801200000_admin_settings.sql", "utf8");
const hardeningMigration = readFileSync("supabase/migrations/20260804800000_automation_hardening.sql", "utf8");
const fictitiousAddress = "Rua Exemplo, 123 - Bairro Teste";

test("payment_confirmed inclui o endereço privado configurado", () => {
  const section = renderPaymentConfirmedAddress("payment_confirmed", { full_address: fictitiousAddress });
  assert.match(section, /Endereço do atendimento/);
  assert.match(section, /Rua Exemplo, 123/);
});

test("payment_confirmed omite a seção quando o endereço está ausente", () => {
  assert.equal(renderPaymentConfirmedAddress("payment_confirmed", {}), "");
  assert.equal(renderPaymentConfirmedAddress("payment_confirmed", { full_address: "   " }), "");
});

test("pagamentos pendente e recusado não recebem o endereço", () => {
  assert.equal(renderPaymentConfirmedAddress("payment_review", { full_address: fictitiousAddress }), "");
  assert.equal(renderPaymentConfirmedAddress("payment_refused", { full_address: fictitiousAddress }), "");
});

test("outros templates não recebem o endereço", () => {
  for (const template of ["appointment_confirmed", "cancellation", "promotion", "daily_summary"]) {
    assert.equal(renderPaymentConfirmedAddress(template, { full_address: fictitiousAddress }), "");
  }
});

test("endereço é lido somente pelo worker e apenas para payment_confirmed", () => {
  assert.match(worker, /if \(templateId === "payment_confirmed"\)/);
  assert.match(worker, /\.from\("studio_settings"\)[\s\S]*?\.select\("private_data"\)/);
  assert.doesNotMatch(settingsService, /full_address/);
});

test("configuração pública continua retornando somente public_data", () => {
  assert.match(settingsMigration, /get_public_settings\(\)[\s\S]*?select public_data from public\.studio_settings/);
  assert.doesNotMatch(settingsMigration.match(/get_public_settings\(\)[\s\S]*?\$\$/)?.[0] || "", /private_data/);
});

test("endereço não altera idempotência nem cria um segundo evento", () => {
  assert.match(hardeningMigration, /'payment-approved:'\|\|new\.id/);
  assert.equal((hardeningMigration.match(/enqueue_automation_email\(new\.email,'payment_confirmed'/g) || []).length, 1);
  assert.doesNotMatch(worker, /enqueue_automation_email/);
});
