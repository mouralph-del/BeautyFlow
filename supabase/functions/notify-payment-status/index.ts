import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getAdminClient, jsonResponse, sendTemplateEmail } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorization || !url || !anon) throw new Error("Sessão administrativa não encontrada.");
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (user?.app_metadata?.role !== "admin") throw new Error("Acesso restrito à administradora.");

    const { appointmentId, approved } = await request.json();
    const client = getAdminClient();
    const { data: appointment, error } = await client.from("appointments")
      .select("customer_name,email,appointment_date,appointment_time,service_name")
      .eq("id", appointmentId).single();
    if (error) throw error;
    const templateId = approved ? "payment_confirmed" : "payment_refused";
    const preferenceId = approved ? "payment_confirmed" : "payment_refused";
    const result = await sendTemplateEmail({
      client, recipient: appointment.email, templateId, preferenceId,
      eventKey: `payment-${approved ? "approved" : "rejected"}:${appointmentId}`,
      variables: { customer_name: appointment.customer_name, appointment_date: appointment.appointment_date, appointment_time: String(appointment.appointment_time).slice(0, 5), service_name: appointment.service_name || "atendimento" },
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("[notify-payment-status]", error instanceof Error ? error.message : error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado." }, 400);
  }
});
