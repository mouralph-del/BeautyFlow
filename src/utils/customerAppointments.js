// During tests Node cannot import image files. Use string fallbacks
const designImage = "/assets/gallery/design-com-henna.jpg";
const microbladingImage = "/assets/gallery/microblading.jpg";
export { appointmentGroup, getAppointmentActions, isActiveAppointment, isCompletedAppointment, normalizeStatus } from "./appointmentStatus.js";
import { normalizeStatus } from "./appointmentStatus.js";

export const toAppointmentDate = (appointment) =>
  new Date(`${appointment.date}T${appointment.time || "00:00"}`);

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
