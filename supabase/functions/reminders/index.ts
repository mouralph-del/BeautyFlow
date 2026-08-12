import { corsHeaders, getAdminClient, jsonResponse, processOutbox, requireAutomationRequest } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAutomationRequest(request);
    const client = getAdminClient();
    const { error } = await client.rpc("prepare_hourly_automation_emails");
    if (error) throw error;
    return jsonResponse({ ok: true, results: await processOutbox(client, "reminders") });
  } catch (error) {
    console.error("[reminders]", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ ok: false, error: message }, message.includes("autorizada") || message.includes("Método") ? 401 : 500);
  }
});
