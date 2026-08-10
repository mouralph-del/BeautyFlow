import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260804400000_transactional_promotions.sql");
const booking = read("src/pages/Booking.jsx");
const finance = read("supabase/migrations/20260801180000_admin_finance.sql");

test("promoção válida é transportada, validada no servidor e salva", () => {
  assert.match(booking, /promotion_id: selectedPromotion\?\.id/);
  assert.match(booking, /catalog_service_id: selectedService\.dbId/);
  assert.match(migration, /selected_promotion\.status <> 'active'/);
  assert.match(migration, /starts_at/);
  assert.match(migration, /ends_at/);
  assert.match(migration, /promotion_id,original_service_price,promotion_discount/);
});

test("promoções expirada, pausada, esgotada e serviço não participante são recusados", () => {
  assert.match(migration, /Promoção indisponível/);
  assert.match(migration, /usage_count >= selected_promotion\.usage_limit/);
  assert.match(migration, /Promoção esgotada/);
  assert.match(migration, /public\.promotion_services allowed/);
  assert.match(migration, /Promoção não aplicável/);
});

test("concorrência de uso é serializada e o contador sobe atomicamente", () => {
  assert.match(migration, /for update/);
  assert.match(migration, /set usage_count=usage_count\+1/);
});

test("valor promocional é persistido e Financeiro usa o valor salvo", () => {
  assert.match(migration, /final_total,final_reservation,final_total-final_reservation/);
  assert.match(finance, /balance=greatest\(coalesce\(a\.service_price,0\)-already,0\)/);
  assert.match(finance, /values\(new\.id,new\.user_id,'reservation',coalesce\(new\.reservation_amount,0\)/);
});
