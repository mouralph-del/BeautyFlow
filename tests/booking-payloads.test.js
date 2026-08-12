import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const appointments = readFileSync("src/services/appointments.js", "utf8");
const requests = readFileSync("src/services/bookingRequests.js", "utf8");
const normal = booking.slice(booking.indexOf("const appointmentData"), booking.indexOf("try {", booking.indexOf("const appointmentData")));
const fit = booking.slice(booking.indexOf("const requestData"), booking.indexOf("try {", booking.indexOf("const requestData")));

test("payload normal contém cliente, data, horário, duração, valores e consentimentos", () => {
  for (const field of ["customer_name", "phone", "email", "appointment_date", "appointment_time", "end_time", "image_authorization", "reservation_policy_accepted", "service_price", "reservation_amount", "remaining_amount", "duration_minutes"]) assert.match(normal, new RegExp(`${field}:`));
});

test("payload normal transporta promoção somente pelo ID selecionado", () => assert.match(normal, /promotion_id: selectedPromotion\?\.id \?\? null/));

test("serviços do agendamento preservam catálogo, preço, duração e reserva", () => {
  for (const field of ["service_id", "catalog_service_id", "service_name", "duration_minutes", "service_price", "reservation_amount"]) assert.match(normal, new RegExp(`${field}:`));
});

test("comprovante é entregue ao serviço transacional", () => assert.match(booking, /createCompleteAppointment\(\{[\s\S]*paymentProof/));

test("serviço normal usa RPC transacional atual", () => assert.match(appointments, /rpc\(\s*"create_appointment_with_services"/));

test("falha após upload remove o comprovante temporário", () => {
  assert.ok(appointments.indexOf("uploadPaymentProof") < appointments.indexOf("removePaymentProof(paymentProofPath)"));
  assert.match(appointments, /catch \(error\) \{[\s\S]*await removePaymentProof\(paymentProofPath\)/);
});

test("conflito 23505 recebe mensagem amigável", () => {
  assert.match(booking, /error\.code === "23505"/);
  assert.match(booking, /Este horário acabou de ser reservado/);
});

test("payload de encaixe contém seleção, preferência, cliente e consentimento", () => {
  for (const field of ["service_id", "service_name", "duration_minutes", "total_price", "reservation_amount", "remaining_amount", "preferred_period", "specific_time", "services_data", "customer_name", "phone", "email", "image_authorization", "appointment_date", "appointment_time"]) assert.match(fit, new RegExp(`${field}:`));
});

test("encaixe usa RPC específica", () => assert.match(requests, /rpc\("customer_create_fit_request"/));
test("pagamento de encaixe usa RPC específica", () => assert.match(requests, /rpc\("customer_submit_fit_payment"/));

test("fitPayment não chama criação normal", () => {
  const finalizerStart = booking.indexOf("const handleFinalizeAppointment");
  const branch = booking.slice(booking.indexOf("if (fitPayment)", finalizerStart), booking.indexOf("if (!isValidWhatsApp", finalizerStart));
  assert.match(branch, /submitFitPaymentProof/);
  assert.doesNotMatch(branch, /createCompleteAppointment/);
});

test("PaymentStep bloqueia clique duplicado enquanto envia", () => {
  const payment = readFileSync("src/components/booking/PaymentStep.jsx", "utf8");
  assert.match(payment, /disabled=\{isSending \|\| !pixPayment\}/);
  assert.match(payment, /setIsSending\(true\)/);
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createFitRequestSubmission = (rpc) => {
  let locked = false;
  let loading = false;
  let completed = false;
  let calls = 0;

  const submit = async () => {
    if (locked) return;
    locked = true;
    loading = true;
    calls += 1;
    try {
      await rpc();
      completed = true;
    } catch {
      locked = false;
    } finally {
      loading = false;
    }
  };

  return {
    submit,
    state: () => ({ locked, loading, completed, calls }),
  };
};

test("envio de encaixe possui guarda síncrona contra clique duplicado", () => {
  const handler = booking.slice(booking.indexOf("const handleBookingRequest"), booking.indexOf("const handleFinalizeAppointment"));
  assert.match(handler, /if \(fitRequestSubmissionRef\.current\) return/);
  assert.match(handler, /fitRequestSubmissionRef\.current = true/);
  assert.match(handler, /setIsSubmittingRequest\(true\)/);
  assert.match(handler, /catch \(error\)[\s\S]*fitRequestSubmissionRef\.current = false/);
});

test("clique duplo síncrono chama a RPC apenas uma vez", async () => {
  const request = deferred();
  const flow = createFitRequestSubmission(() => request.promise);
  const first = flow.submit();
  const second = flow.submit();
  assert.equal(flow.state().calls, 1);
  request.resolve();
  await Promise.all([first, second]);
});

test("clique durante requisição pendente é ignorado", async () => {
  const request = deferred();
  const flow = createFitRequestSubmission(() => request.promise);
  const first = flow.submit();
  await flow.submit();
  assert.deepEqual(flow.state(), { locked: true, loading: true, completed: false, calls: 1 });
  request.resolve();
  await first;
});

test("falha libera a guarda e permite nova tentativa", async () => {
  let attempt = 0;
  const flow = createFitRequestSubmission(async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("falha");
  });
  await flow.submit();
  assert.deepEqual(flow.state(), { locked: false, loading: false, completed: false, calls: 1 });
  await flow.submit();
  assert.deepEqual(flow.state(), { locked: true, loading: false, completed: true, calls: 2 });
});

test("sucesso conclui o fluxo e impede nova solicitação", async () => {
  const flow = createFitRequestSubmission(async () => {});
  const submission = flow.submit();
  assert.equal(flow.state().loading, true);
  await submission;
  assert.deepEqual(flow.state(), { locked: true, loading: false, completed: true, calls: 1 });
  await flow.submit();
  assert.equal(flow.state().calls, 1);
});
