import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260804900000_payment_transactional_preferences.sql", "utf8");
const worker = readFileSync("supabase/functions/_shared/email.ts", "utf8");
const legacyEndpoint = readFileSync("supabase/functions/notify-payment-status/index.ts", "utf8");
const settings = readFileSync("src/pages/AdminSettings.jsx", "utf8");
const addressTests = readFileSync("tests/email/payment-confirmed-address.test.js", "utf8");

test("aprovação usa preferência transacional própria, sem depender de payment_proof", () => {
  assert.match(migration, /'payment_confirmed', true, 'high'/);
  assert.match(migration, /'payment_confirmed','payment_confirmed','payment-approved:'\|\|new\.id/);
  assert.doesNotMatch(migration, /'payment_confirmed','payment_proof'/);
  assert.match(legacyEndpoint, /approved \? "payment_confirmed" : "payment_refused"/);
});

test("recusa usa preferência transacional própria", () => {
  assert.match(migration, /'payment_refused', true, 'high'/);
  assert.match(migration, /'payment_refused','payment_refused','payment-rejected:'\|\|new\.id/);
});

test("comprovante recebido preserva preferências administrativas independentes", () => {
  assert.match(migration, /'admin_payment_review','admin_payment_review','admin-payment-review:'\|\|new\.id/);
  assert.match(migration, /'payment_review','payment_analysis','payment-review:'\|\|new\.id/);
  assert.doesNotMatch(migration, /'payment_review','payment_confirmed'/);
});

test("transacionais obrigatórios não são suprimidos por preferência administrativa", () => {
  assert.match(worker, /requiredTransactionalPreferences = new Set\(\["payment_confirmed", "payment_refused"\]\)/);
  assert.match(worker, /!requiredTransactionalPreferences\.has\(preferenceId\)/);
  assert.match(settings, /customerPaymentPreferences = new Set\(\["payment_analysis", "payment_confirmed", "payment_refused", "payment_proof"\]\)/);
  assert.match(settings, /admin_payment_review:"Comprovante enviado"/);
});

test("aprovação e recusa mantêm um único evento idempotente cada", () => {
  assert.equal((migration.match(/'payment-approved:'\|\|new\.id/g) || []).length, 1);
  assert.equal((migration.match(/'payment-rejected:'\|\|new\.id/g) || []).length, 1);
  assert.match(worker, /"Idempotency-Key": eventKey\.slice\(0, 256\)/);
});

test("endereço confirmado continua opcional e restrito à aprovação", () => {
  assert.match(addressTests, /inclui o endereço privado configurado/);
  assert.match(addressTests, /omite a seção quando o endereço está ausente/);
  assert.match(addressTests, /pagamentos pendente e recusado não recebem o endereço/);
});

test("nenhuma automação não relacionada é alterada pela migration", () => {
  assert.doesNotMatch(migration, /promotion|reminder_24h|daily_summary|holiday|no_show/);
});
