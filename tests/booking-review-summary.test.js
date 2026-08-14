import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const review = readFileSync("src/components/booking/BookingReviewStep.jsx", "utf8");

test("card principal não é repetido na revisão nem no pagamento", () => {
  assert.match(booking, /step < 3[\s\S]*<BookingServiceSummary service=\{service\}/);
  assert.doesNotMatch(booking, /step !== 5[\s\S]{0,100}<BookingServiceSummary/);
});

test("resumo final renderiza cada serviço selecionado uma única vez", () => {
  assert.equal((review.match(/services\.map\(/g) || []).length, 1);
  assert.match(review, /key=\{service\.id\}/);
  assert.match(review, /service\.title/);
  assert.match(review, /service\.durationLabel/);
  assert.match(review, /service\.price/);
});

test("resumo preserva totais, reserva e restante", () => {
  for (const field of ["totalPrice", "totalDeposit", "remainingAmount"]) {
    assert.match(review, new RegExp(`\\{${field}\\}`));
  }
});

test("payload transacional do Booking permanece independente da apresentação", () => {
  assert.match(booking, /const appointmentData = \{/);
  assert.match(booking, /const appointmentServices = selectedServices\.map/);
  assert.match(booking, /createCompleteAppointment\(\{/);
});
