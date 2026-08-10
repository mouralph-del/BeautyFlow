import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getAdminClient, jsonResponse, sendTemplateEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { appointmentId, cancellationToken } = await request.json();
    const client = getAdminClient();
    const { data: appointment, error } = await client.from("appointments")
      .select("id,customer_name,email,appointment_date,appointment_time,cancellation_token,status,service_name")
      .eq("id", appointmentId).single();
    if (error || appointment?.status !== "cancelado") throw new Error("Cancelamento não encontrado.");

    let authorized = cancellationToken === appointment.cancellation_token;
    const authorization = request.headers.get("Authorization");
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorized && authorization && url && anon) {
      const authClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
      const { data } = await authClient.auth.getUser();
      authorized = data.user?.email?.toLowerCase() === appointment.email.toLowerCase();
    }
    if (!authorized) throw new Error("Acesso não autorizado.");

    const { data: services } = await client.from("appointment_services").select("service_name").eq("appointment_id", appointmentId);
    const names = services?.map((item) => item.service_name).join(", ") || appointment.service_name || "Atendimento";
    const result = await sendTemplateEmail({
      client, recipient: appointment.email, templateId: "cancellation", preferenceId: "cancellation",
      eventKey: `appointment-cancelled:${appointmentId}`,
      variables: { customer_name: appointment.customer_name, service_name: names, appointment_date: appointment.appointment_date, appointment_time: String(appointment.appointment_time).slice(0, 5) },
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("[notify-cancellation]", error instanceof Error ? error.message : error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 400);
  }
});
