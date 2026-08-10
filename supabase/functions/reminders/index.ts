import { corsHeaders, getAdminClient, jsonResponse, processOutbox } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const client = getAdminClient();
    const { error } = await client.rpc("prepare_hourly_automation_emails");
    if (error) throw error;
    return jsonResponse({ ok: true, results: await processOutbox(client, "reminders") });
  } catch (error) {
    console.error("[reminders]", error instanceof Error ? error.message : error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
