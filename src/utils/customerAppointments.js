// During tests Node cannot import image files. Use string fallbacks
const designImage = "/assets/gallery/design-com-henna.jpg";
const microbladingImage = "/assets/gallery/microblading.jpg";
export { appointmentGroup, getAppointmentActions, isActiveAppointment, isCompletedAppointment, normalizeStatus } from "./appointmentStatus.js";
import { appointmentGroup, normalizeStatus } from "./appointmentStatus.js";

export const toAppointmentDate = (appointment) =>
  new Date(`${appointment.date}T${appointment.time || "00:00"}`);

export const getAppointmentValue = (appointment) => {
  const persistedValue = Number(appointment?.value);
  if (persistedValue > 0) return persistedValue;

  return (appointment?.services ?? []).reduce(
    (total, service) => total + Number(service.price ?? service.service_price ?? 0),
    0
  );
};

export const getNextAppointment = (appointments, now = new Date()) =>
  appointments
    .filter((appointment) => {
      const appointmentDate = toAppointmentDate(appointment);
      return appointmentGroup(appointment) === "proximos"
        && Number.isFinite(appointmentDate.getTime())
        && appointmentDate >= now;
    })
    .sort((left, right) => toAppointmentDate(left) - toAppointmentDate(right))[0];

export const formatAppointmentDate = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");

export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });


export const appointmentStatusLabel = (status) => ({ concluido:"Concluído", cancelado:"Cancelado", confirmado:"Confirmado", nao_compareceu:"Não compareceu", aguardando_pagamento:"Aguardando pagamento", em_analise:"Pagamento em análise" }[normalizeStatus(status)] || String(status||"").replaceAll("_"," "));


export const getAppointmentImage = (appointment) => {
  // Prioridade: imagem do catálogo (services[*].image_url) -> imagem do próprio agendamento -> fallback do estúdio
  const serviceImage = appointment?.services?.[0]?.image_url || appointment?.services?.[0]?.image;
  if (serviceImage) return serviceImage;
  if (appointment?.image_url) return appointment.image_url;
  const name = (appointment.serviceName || "").toLowerCase();
  if (name.includes("microblading")) return microbladingImage;
  if (name.includes("design com henna")) return designImage;
  return null;
};
