import { corsHeaders, getAdminClient, getEmailEnvironment, jsonResponse, processOutbox, requireAutomationRequest } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAutomationRequest(request);
    const adminEmail = getEmailEnvironment().adminEmail;
    if (!adminEmail) throw new Error("THAIS_ADMIN_EMAIL não configurado.");
    const client = getAdminClient();
    const { error } = await client.rpc("prepare_daily_summary_email", { admin_email: adminEmail });
    if (error) throw error;
    return jsonResponse({ ok: true, results: await processOutbox(client, "daily-summary") });
  } catch (error) {
    console.error("[daily-summary]", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ ok: false, error: message }, message.includes("autorizada") || message.includes("Método") ? 401 : 500);
  }
});
