import { corsHeaders, getAdminClient, getEmailEnvironment, jsonResponse, processOutbox } from "../_shared/email.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const adminEmail = getEmailEnvironment().adminEmail;
    if (!adminEmail) throw new Error("THAIS_ADMIN_EMAIL não configurado.");
    const client = getAdminClient();
    const { error } = await client.rpc("prepare_daily_summary_email", { admin_email: adminEmail });
    if (error) throw error;
    return jsonResponse({ ok: true, results: await processOutbox(client, "daily-summary") });
  } catch (error) {
    console.error("[daily-summary]", error instanceof Error ? error.message : error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
