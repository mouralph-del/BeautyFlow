import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getScheduleReleaseMonths } from "../src/utils/monthlySchedule.js";

const servicesCss = readFileSync("src/pages/Services.css", "utf8");
const storyCss = readFileSync("src/pages/MyStory.css", "utf8");
const dashboard = readFileSync("src/pages/AdminDashboard.jsx", "utf8");
const monthlyRelease = readFileSync("src/components/admin/MonthlyScheduleRelease.jsx", "utf8");
const availability = readFileSync("src/hooks/useBookingAvailability.js", "utf8");

test("filtros de serviços usam Todos em linha inteira e categorias em duas colunas no celular", () => {
  const mobileRules = servicesCss.slice(servicesCss.indexOf("@media (max-width: 560px)"));

  assert.match(mobileRules, /\.services-filters\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileRules, /\.services-filters button:first-child\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(mobileRules, /\.services-filters button\s*\{[\s\S]*?min-height:\s*44px/);
});

test("retrato da Minha História vira um card único somente no celular", () => {
  const mobileRules = storyCss.slice(storyCss.indexOf("@media (max-width: 480px)"));

  assert.match(mobileRules, /\.story-portrait\s*\{[\s\S]*?overflow:\s*hidden[\s\S]*?border-radius:\s*20px/);
  assert.match(mobileRules, /\.story-portrait > span\s*\{\s*display:\s*none/);
  assert.match(mobileRules, /\.story-portrait img\s*\{[\s\S]*?height:\s*clamp\(300px, 105vw, 390px\)/);
});

test("o mês atual permanece disponível para liberação enquanto ainda há dias futuros", () => {
  const earlySeptember = getScheduleReleaseMonths(new Date(2026, 8, 3, 10));

  assert.equal(earlySeptember.hasFutureDaysInCurrentMonth, true);
  assert.deepEqual(
    [earlySeptember.currentMonth.getFullYear(), earlySeptember.currentMonth.getMonth() + 1],
    [2026, 9]
  );
  assert.deepEqual(
    [earlySeptember.nextMonth.getFullYear(), earlySeptember.nextMonth.getMonth() + 1],
    [2026, 10]
  );
});

test("último dia do mês não oferece um mês atual sem datas futuras", () => {
  const lastDay = getScheduleReleaseMonths(new Date(2026, 8, 30, 10));

  assert.equal(lastDay.hasFutureDaysInCurrentMonth, false);
});

test("Dashboard apresenta mês atual e próximo mês, enquanto dias passados seguem indisponíveis", () => {
  assert.match(dashboard, /getScheduleReleaseMonths\(\)/);
  assert.match(dashboard, /date=\{scheduleReleaseMonths\.currentMonth\}[\s\S]*?heading="Agenda do mês atual"/);
  assert.match(dashboard, /date=\{scheduleReleaseMonths\.nextMonth\}[\s\S]*?heading="Agenda do próximo mês"/);
  assert.match(monthlyRelease, /const isPastDate = \(day\) => dateKey\(day\) < todayKey/);
  assert.match(monthlyRelease, /disabled=\{closed \|\| past\}/);
  assert.match(availability, /Boolean\(daySettings\?\.active\) && Boolean\(release\)/);
});
