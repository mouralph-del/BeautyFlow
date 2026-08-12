import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTimeSlotStatus } from "../src/utils/timeUtils.js";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const date = new Date("2026-08-13T12:00:00");
const schedule = { opening: "09:00", closing: "18:00", breakStart: "12:00", breakEnd: "13:30" };
const status = (overrides = {}) => getTimeSlotStatus({ startTime: "10:00", durationMinutes: 60, selectedDate: date, bookedAppointments: [], scheduleOverride: schedule, ...overrides });

test("mês não liberado impede seleção da data", () => {
  assert.match(booking, /return Boolean\(daySettings\?\.active\) && Boolean\(release\)/);
});

test("dia bloqueado impede seleção da data", () => {
  assert.match(booking, /!\(release\.blocked_dates \?\? \[\]\)\.includes\(dateValue\)/);
});

test("horário especial tem precedência sobre exceção diária e agenda regular", () => {
  assert.match(booking, /selectedSpecialHours \?\? dayAvailability\.special_hours \?\? configuredDay/);
});

test("slot regular dentro do expediente fica disponível", () => assert.equal(status(), "available"));

test("bloqueio parcial torna slot incompatível indisponível", () => {
  assert.equal(status({ blockedIntervals: [{ start: "10:30", end: "11:15" }] }), "unavailable");
});

test("agendamento existente torna conflito indisponível", () => {
  assert.equal(status({ bookedAppointments: [{ time: "10:30", durationMinutes: 30 }] }), "unavailable");
});

test("mudança de duração recalcula conflito com intervalo", () => {
  assert.equal(status({ startTime: "11:00", durationMinutes: 45 }), "available");
  assert.equal(status({ startTime: "11:00", durationMinutes: 90 }), "hidden");
});

test("até quinze minutos além do fechamento exige aprovação", () => {
  assert.equal(status({ startTime: "17:30", durationMinutes: 40 }), "approval");
});

test("horário passado é removido da seleção pelo relógio", () => {
  assert.match(booking, /isPastTime\(selectedDate, selectedTime, currentTime\)[\s\S]*setSelectedTime\(""\)/);
  assert.match(booking, /setInterval\([\s\S]*60000/);
});

test("consulta de exceções ignora resposta após cleanup", () => {
  const effect = booking.slice(booking.indexOf("getPublicDayAvailability"), booking.indexOf("const fetchBookedTimes"));
  assert.match(effect, /let active = true/);
  assert.match(effect, /return \(\) => \{ active = false; \}/);
});

test("BUG DE CARACTERIZAÇÃO: consulta de ocupações não protege respostas fora de ordem", () => {
  const effect = booking.slice(booking.indexOf("const fetchBookedTimes"), booking.indexOf("const handleBookingRequest"));
  assert.match(effect, /setBookedAppointments\(appointments\)/);
  assert.doesNotMatch(effect, /active|requestId|AbortController/);
});
