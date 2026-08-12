import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const customerHandler = booking.slice(booking.indexOf("const handleCustomerContinue"), booking.indexOf("const handleReservationPolicyChange"));

test("perfil autenticado é carregado pela API do próprio usuário", () => {
  assert.match(booking, /getOwnCustomerProfile\(\)/);
  assert.match(booking, /user\.app_metadata\?\.role === "admin"/);
});

test("perfil completo exibe confirmação antes da edição", () => {
  assert.match(booking, /user && profileComplete && !editingProfile/);
});

test("perfil válido é salvo antes da etapa de revisão", () => {
  assert.match(customerHandler, /await saveOwnCustomerProfile/);
  assert.ok(customerHandler.indexOf("saveOwnCustomerProfile") < customerHandler.indexOf("setStep(3)"));
});

test("nome com menos de três caracteres bloqueia avanço", () => assert.match(customerHandler, /name\.trim\(\)\.length < 3/));
test("telefone inválido bloqueia avanço", () => assert.match(customerHandler, /!isValidWhatsApp\(customerData\.phone\)/));
test("e-mail inválido bloqueia avanço", () => assert.match(customerHandler, /!isValidEmail\(user\?\.email \|\| customerData\.email\)/));
test("autorização de imagem é obrigatória", () => assert.match(customerHandler, /!customerData\.imageAuthorization/));
test("política de reserva precisa ser aceita explicitamente", () => assert.match(customerHandler, /reservationPolicyAccepted !== true/));

test("reservationPolicyAnswered distingue ausência de resposta", () => {
  assert.match(booking, /setReservationPolicyAnswered\(true\)/);
  assert.match(booking, /reservationPolicyAnswered &&\s*customerData\.reservationPolicyAccepted/);
});

test("dados inválidos interrompem antes de persistir perfil", () => {
  assert.ok(customerHandler.indexOf("Object.keys(newErrors).length") < customerHandler.indexOf("saveOwnCustomerProfile"));
});

test("e-mail autenticado permanece somente leitura", () => assert.match(booking, /readOnly=\{Boolean\(user\)\}/));

