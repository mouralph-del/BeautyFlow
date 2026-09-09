import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync(new URL("../../supabase/functions/_shared/email.ts", import.meta.url), "utf8");
const paymentStatus = fs.readFileSync(new URL("../../supabase/functions/notify-payment-status/index.ts", import.meta.url), "utf8");
const cancellation = fs.readFileSync(new URL("../../supabase/functions/notify-cancellation/index.ts", import.meta.url), "utf8");

test("e-mails de cliente enviam Reply-To pelo secret dedicado", () => {
  assert.match(worker, /customerReplyTo: Deno\.env\.get\("CUSTOMER_EMAIL_REPLY_TO"\)\?\.trim\(\)/);
  assert.match(worker, /recipientType === "customer" && Boolean\(environment\.customerReplyTo\)/);
  assert.match(worker, /\{ reply_to: environment\.customerReplyTo \}/);
  assert.match(paymentStatus, /recipientType: "customer"/);
  assert.match(cancellation, /recipientType: "customer"/);
});

test("e-mails administrativos não recebem Reply-To pessoal", () => {
  assert.match(worker, /recipientType: job\.metadata\?\.requires_admin_email \? "admin" : "customer"/);
  assert.match(worker, /\.\.\.\(shouldUseCustomerReplyTo \? \{ reply_to: environment\.customerReplyTo \} : \{\}\)/);
});

test("cliente Resend preserva headers e produz diagnóstico sanitizado", () => {
  assert.match(worker, /Authorization: `Bearer \$\{environment\.resendApiKey\}`/);
  assert.match(worker, /"Content-Type": "application\/json"/);
  assert.match(worker, /"Idempotency-Key": eventKey\.slice\(0, 256\)/);
  assert.match(worker, /"User-Agent": "BeautyFlow\/1\.0"/);
  assert.match(worker, /async function getResendErrorDiagnostic\(response: Response\)/);
  assert.match(worker, /const rawBody = await response\.text\(\)\.catch\(\(\) => ""\)/);
  assert.match(worker, /\[e-mail ocultado\]/);
  assert.match(worker, /\[segredo ocultado\]/);
  assert.match(worker, /if \(!response\.ok\) throw new Error\(await getResendErrorDiagnostic\(response\)\)/);
});

test("secret ausente mantém o envio de cliente seguro", () => {
  assert.match(worker, /CUSTOMER_EMAIL_REPLY_TO não configurado; e-mail de cliente enviado sem Reply-To\./);
  assert.doesNotMatch(worker, /CUSTOMER_EMAIL_REPLY_TO[^\n]*recipient/);
});
