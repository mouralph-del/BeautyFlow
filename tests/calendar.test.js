import test from "node:test"; import assert from "node:assert/strict";
import { dateKey,getMonthCells,parseLocalDate,saoPauloDateKey } from "../src/utils/calendar.js";
const firstColumn=(year,month)=>getMonthCells(year,month).findIndex(Boolean);
test("agosto de 2026 começa no sábado e dia 4 é terça",()=>{const cells=getMonthCells(2026,7);assert.equal(firstColumn(2026,7),6);assert.equal(cells.find((d)=>d?.getDate()===4).getDay(),2)});
test("fevereiro bissexto de 2028 tem 29 dias",()=>assert.equal(getMonthCells(2028,1).filter(Boolean).length,29));
test("meses iniciados domingo e sábado preservam coluna",()=>{assert.equal(firstColumn(2026,1),0);assert.equal(firstColumn(2026,7),6)});
test("virada do ano e parsing YYYY-MM-DD permanecem locais",()=>{assert.equal(dateKey(parseLocalDate("2027-01-01")),"2027-01-01");assert.equal(new Date(2026,11,31,12).getDate(),31)});
test("hoje usa America/Sao_Paulo perto da meia-noite",()=>assert.equal(saoPauloDateKey(new Date("2026-08-05T02:30:00Z")),"2026-08-04"));
