import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");

test("fluxo normal inicia na etapa 1 e fitPayment inicia na etapa 4", () => assert.match(booking, /useState\(fitPayment \? 4 : 1\)/));
test("etapa 1 avança para dados apenas com horário", () => assert.match(booking, /disabled=\{!selectedTime\}[\s\S]*onClick=\{\(\) => setStep\(2\)\}/));
test("etapa 2 permite voltar para seleção", () => assert.match(booking, /onClick=\{\(\) => setStep\(1\)\}[\s\S]*Voltar/));
test("dados válidos avançam da etapa 2 para revisão", () => assert.match(booking, /setStep\(3\)/));
test("revisão permite voltar à etapa 2", () => assert.match(booking, /onClick=\{\(\) => setStep\(2\)\}[\s\S]*Voltar/));
test("revisão normal avança à etapa 4", () => assert.match(booking, /bookingType === "request" \? handleBookingRequest\(\) : setStep\(4\)/));
test("etapa 4 permite voltar à revisão", () => assert.match(booking, /step === 4[\s\S]*onClick=\{\(\) => setStep\(3\)\}/));
test("finalização normal e pagamento de encaixe chegam à etapa 5", () => {
  assert.equal((booking.match(/setStep\(5\)/g) || []).length, 2);
  assert.match(booking, /step === 5 && <ApprovalPendingStep/);
});
test("voltar entre etapas não limpa dados da cliente", () => {
  const navigationHandlers = booking.match(/onClick=\{\(\) => setStep\([1234]\)\}/g) || [];
  assert.ok(navigationHandlers.length >= 4);
  assert.doesNotMatch(navigationHandlers.join("\n"), /setCustomerData/);
});
test("entrada fitPayment preserva data, horário e valores próprios", () => {
  assert.match(booking, /fitPayment\?\.appointmentDate/);
  assert.match(booking, /fitPayment\?\.appointmentTime/);
  for (const key of ["totalDuration", "totalPrice", "reservationAmount", "remainingAmount"]) assert.match(booking, new RegExp(`fitPayment\\?\\.${key}`));
});

test("encaixe sem autenticação redireciona para login preservando o retorno", () => {
  assert.match(booking, /const handleOpenFitRequest = \(\) => \{[\s\S]*if \(!user\)[\s\S]*navigate\("\/entrar", \{[\s\S]*from: `\$\{location\.pathname\}\$\{location\.search\}\$\{location\.hash\}`/);
});

test("os dois acessos ao encaixe usam a mesma guarda de autenticação", () => {
  assert.match(booking, /slot\.status === "approval"[\s\S]*handleOpenFitRequest\(\)/);
  assert.match(booking, /onRequestFit=\{handleOpenFitRequest\}/);
});

test("agendamento normal sem autenticação permanece disponível", () => {
  assert.match(booking, /bookingType === "request" \? handleBookingRequest\(\) : setStep\(4\)/);
  assert.doesNotMatch(booking, /if \(!user\)[\s\S]{0,250}setStep\(4\)/);
});
