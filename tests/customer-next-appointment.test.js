import assert from "node:assert/strict";
import test from "node:test";

import { getAppointmentValue, getNextAppointment, toAppointmentDate } from "../src/utils/customerAppointments.js";

const now = new Date("2026-08-14T10:00:00");
const appointment = (overrides = {}) => ({
  id: "future",
  date: "2026-08-15",
  time: "10:00",
  status: "confirmado",
  value: 80,
  services: [],
  ...overrides,
});

test("sem atendimento futuro retorna estado vazio", () => {
  assert.equal(getNextAppointment([], now), undefined);
});

test("atendimento passado não aparece como próximo", () => {
  assert.equal(getNextAppointment([appointment({ date: "2026-08-13" })], now), undefined);
});

test("atendimento cancelado ou expirado não aparece", () => {
  assert.equal(getNextAppointment([
    appointment({ status: "cancelado" }),
    appointment({ status: "expirado" }),
  ], now), undefined);
});

test("futuro válido aparece", () => {
  assert.equal(getNextAppointment([appointment()], now)?.id, "future");
});

test("ordena pelo atendimento futuro mais próximo", () => {
  const result = getNextAppointment([
    appointment({ id: "later", date: "2026-08-20" }),
    appointment({ id: "nearest", date: "2026-08-14", time: "11:00" }),
  ], now);
  assert.equal(result.id, "nearest");
});

test("valor persistido válido tem prioridade", () => {
  assert.equal(getAppointmentValue(appointment({ value: 70, services: [{ price: 100 }] })), 70);
});

test("registro legado zerado soma os snapshots dos serviços", () => {
  assert.equal(getAppointmentValue(appointment({ value: 0, services: [{ price: 40 }, { price: 55 }] })), 95);
});

test("valor promocional persistido não é recalculado", () => {
  assert.equal(getAppointmentValue(appointment({ value: 65, services: [{ price: 80 }, { price: 40 }] })), 65);
});

test("data e horário são interpretados localmente sem deslocar o dia", () => {
  const parsed = toAppointmentDate(appointment({ date: "2026-08-15", time: "00:30" }));
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 7);
  assert.equal(parsed.getDate(), 15);
  assert.equal(parsed.getHours(), 0);
  assert.equal(parsed.getMinutes(), 30);
});
