import { supabase } from "../lib/supabase";

const attachServices = async (appointments) => {
  const ids = appointments.map(({ id }) => id);
  if (!ids.length) return appointments.map((item) => ({ ...item, services: [] }));
  const { data, error } = await supabase.from("appointment_services").select("*").in("appointment_id", ids);
  if (error) throw error;
  const grouped = (data ?? []).reduce((map, service) => {
    map[service.appointment_id] = [...(map[service.appointment_id] ?? []), service];
    return map;
  }, {});
  return appointments.map((item) => ({ ...item, services: grouped[item.id] ?? [] }));
};

export async function getAdminRequests({ from, to } = {}) {
  let appointmentsQuery = supabase.from("appointments").select("*").order("created_at", { ascending: false });
  if (from) appointmentsQuery = appointmentsQuery.gte("appointment_date", from);
  if (to) appointmentsQuery = appointmentsQuery.lte("appointment_date", to);
  const [appointmentsResult, fitsResult, reschedulesResult, historyResult] = await Promise.all([
    appointmentsQuery,
    supabase.from("booking_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("reschedule_requests").select("*, appointment:appointments(*)").order("created_at", { ascending: false }),
    supabase.from("request_activity").select("*").order("created_at", { ascending: false }),
  ]);
  const error = appointmentsResult.error || fitsResult.error || reschedulesResult.error || historyResult.error;
  if (error) throw error;
  const appointments = await attachServices(appointmentsResult.data ?? []);
  const appointmentMap = Object.fromEntries(appointments.map((item) => [item.id, item]));
  return {
    payments: appointments.filter((item) => item.payment_status === "em_analise"),
    cancellations: appointments.filter((item) => item.status === "cancelado"),
    fits: fitsResult.data ?? [],
    reschedules: (reschedulesResult.data ?? []).map((item) => ({ ...item, appointment: appointmentMap[item.appointment_id] ?? item.appointment })),
    history: historyResult.data ?? [],
  };
}

export async function getPaymentProofUrl(path) {
  if (!path) throw new Error("Este agendamento não possui comprovante.");
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export async function getAdminPaymentRequest(id) {
  const { data, error } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await attachServices([data]))[0];
}

export async function reviewPayment(values) {
  const { data, error } = await supabase.rpc("admin_review_payment", {
    target_appointment_id: values.id,
    approved: values.approved,
    rejection_reason: values.reason || null,
    rejection_notes: values.notes || null,
  });
  if (error) throw error;
  return { data, emailQueued: true };
}

export async function reviewFit(values) {
  const { data, error } = await supabase.rpc("admin_review_booking_request", {
    target_request_id: values.id, action_name: values.action,
    target_date: values.date || null, target_time: values.time || null,
    admin_text: values.message || null, refusal_reason: values.reason || null,
  });
  if (error) throw error;
  return data;
}

export async function reviewReschedule(values) {
  const { data, error } = await supabase.rpc("admin_review_reschedule_request", {
    target_request_id: values.id, action_name: values.action,
    target_date: values.date || null, target_time: values.time || null,
    admin_text: values.message || null,
  });
  if (error) throw error;
  return data;
}
