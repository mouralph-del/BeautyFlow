import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260909100000_enable_customer_cancellation_email.sql",
  "utf8"
);
const worker = readFileSync("supabase/functions/_shared/email.ts", "utf8");

test("habilita somente o e-mail transacional de cancelamento da cliente", () => {
  assert.match(migration, /set email_enabled = true/);
  assert.match(migration, /where id = 'cancellation'/);
  assert.doesNotMatch(migration, /admin_cancellation|appointment_confirmed|payment_|reschedule_status|reminder_24h/);
});

test("cancelamento mantém Reply-To apenas para destinatária cliente e idempotência", () => {
  assert.match(worker, /recipientType === "customer"/);
  assert.match(worker, /reply_to: environment\.customerReplyTo/);
  assert.match(worker, /"Idempotency-Key": eventKey\.slice\(0, 256\)/);
});
