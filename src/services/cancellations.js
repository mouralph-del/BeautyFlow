import { supabase } from "../lib/supabase";

export const getCancellationDetails = async ({ appointmentId, token }) => {
  const { data, error } = await supabase.rpc("get_cancellation_details", {
    target_appointment_id: appointmentId,
    cancellation_access_token: token || null,
  });

  if (error) {
    throw new Error("Não foi possível consultar este atendimento agora.");
  }

  return data;
};

export const cancelAppointment = async ({
  appointmentId,
  token,
  reason = null,
}) => {
  const { data, error } = await supabase.rpc(
    "cancel_customer_appointment",
    {
      target_appointment_id: appointmentId,
      cancellation_access_token: token || null,
      cancellation_reason: reason,
    }
  );

  if (error) {
    throw new Error("Não foi possível cancelar este atendimento agora. Tente novamente em instantes.");
  }

  return {
    cancellation: data,
    emailsQueued: true,
  };
};
