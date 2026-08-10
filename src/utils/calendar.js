export const WEEKDAYS_PT_BR = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const parseLocalDate = (value) => { const [year,month,day]=String(value).split("-").map(Number); return new Date(year,month-1,day,12); };
export const getMonthCells = (year, monthIndex) => {
  const first = new Date(year,monthIndex,1,12); const last = new Date(year,monthIndex+1,0,12);
  return [...Array(first.getDay()).fill(null), ...Array.from({length:last.getDate()},(_,index)=>new Date(year,monthIndex,index+1,12))];
};
export const saoPauloDateKey = (instant = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part)=>[part.type,part.value])); return `${value.year}-${value.month}-${value.day}`;
};
