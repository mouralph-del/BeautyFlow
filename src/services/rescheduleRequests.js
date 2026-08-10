import { supabase } from "../lib/supabase";

const runRpc = async (name, parameters) => {
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) throw error;
  if (data?.success === false) throw new Error(data.message);
  return data;
};

export const createRescheduleRequest = ({ appointmentId, date, time, reason }) =>
  runRpc("customer_create_reschedule_request", {
    target_appointment_id: appointmentId,
    target_date: date,
    target_time: time,
    customer_reason: reason?.trim() || null,
  });

export const cancelRescheduleRequest = (requestId) =>
  runRpc("customer_cancel_reschedule_request", { target_request_id: requestId });

export const respondToRescheduleProposal = (requestId, accept) =>
  runRpc("customer_respond_reschedule_proposal", {
    target_request_id: requestId,
    accept_proposal: accept,
  });

export async function getRescheduleBookedAppointments(date, appointmentId) {
  const rows = await runRpc("get_reschedule_booked_times", {
    target_date: date,
    ignored_appointment_id: appointmentId,
  });

  return (rows ?? []).map((appointment) => ({
    time: appointment.appointment_time.slice(0, 5),
    durationMinutes: appointment.duration_minutes,
  }));
}

export const getRescheduleErrorMessage = (error) => {
  const message = error?.message || "";
  const knownMessages = [
    "horário", "agenda", "data", "intervalo", "expediente", "solicitação",
    "agendamento", "sessão", "remarcação", "atendimento",
  ];

  return knownMessages.some((term) => message.toLowerCase().includes(term))
    ? message
    : "Não foi possível concluir a solicitação. Tente novamente em instantes.";
};
