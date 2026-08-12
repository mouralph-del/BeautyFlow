import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_SIGNATURE, renderEmailLayout, renderTemplate } from "./email-template.js";

export type AdminClient = SupabaseClient;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-beautyflow-automation-secret",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuração interna do Supabase ausente.");
  return createClient(url, key);
}

export function getEmailEnvironment() {
  return {
    resendApiKey: Deno.env.get("RESEND_API_KEY"),
    emailFrom: Deno.env.get("PAYMENT_EMAIL_FROM"),
    adminEmail: Deno.env.get("THAIS_ADMIN_EMAIL"),
    siteUrl: Deno.env.get("SITE_URL"),
  };
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = leftDigest.length ^ rightDigest.length;
  for (let index = 0; index < leftDigest.length; index += 1) difference |= leftDigest[index] ^ rightDigest[index];
  return difference === 0;
}

export async function requireAutomationRequest(request: Request) {
  if (request.method !== "POST") throw new Error("Método não permitido para a automação.");
  const configuredSecret = Deno.env.get("AUTOMATION_CRON_SECRET")?.trim();
  const providedSecret = request.headers.get("x-beautyflow-automation-secret")?.trim();
  if (!configuredSecret || !providedSecret || !(await secureEqual(configuredSecret, providedSecret))) {
    throw new Error("Chamada automática não autorizada.");
  }
}

export async function sendTemplateEmail({
  client,
  recipient,
  templateId,
  preferenceId,
  variables,
  eventKey,
  priority,
}: {
  client: AdminClient;
  recipient: string;
  templateId: string;
  preferenceId: string;
  variables: Record<string, unknown>;
  eventKey: string;
  priority?: string;
}) {
  const environment = getEmailEnvironment();
  const { data: delivered } = await client
    .from("email_delivery_logs")
    .select("id")
    .eq("event_key", eventKey)
    .eq("status", "sent")
    .maybeSingle();
  if (delivered) return { sent: false, skipped: true, duplicate: true };
  const [{ data: preference }, { data: template }, { data: fallback }] = await Promise.all([
    client.from("notification_preferences").select("email_enabled, priority").eq("id", preferenceId).maybeSingle(),
    client.from("email_templates").select("subject,title,subtitle,body,signature,button_text,button_url").eq("id", templateId).maybeSingle(),
    client.from("email_templates").select("subject,title,subtitle,body,signature,button_text,button_url").eq("id", "automation_fallback").maybeSingle(),
  ]);

  const effectiveTemplate = template || fallback;
  const effectivePriority = priority || preference?.priority || "normal";
  if (preference && !preference.email_enabled) {
    await client.from("email_delivery_logs").insert({ recipient, template_id: templateId, preference_id: preferenceId, event_key: eventKey, priority: effectivePriority, status: "skipped", error_message: "E-mail desativado nas preferências." });
    return { sent: false, skipped: true };
  }
  if (!effectiveTemplate) throw new Error(`Template ${templateId} e fallback não encontrados.`);
  if (!environment.resendApiKey) throw new Error("RESEND_API_KEY não configurada; envio registrado para nova tentativa.");
  if (!environment.emailFrom) throw new Error("PAYMENT_EMAIL_FROM não configurado; envio registrado para nova tentativa.");

  const templateVariables = { site_url: environment.siteUrl || "", ...variables };
  const subject = renderTemplate(effectiveTemplate.subject, templateVariables);
  const html = renderEmailLayout({
    title: renderTemplate(effectiveTemplate.title, templateVariables, { html: true }),
    subtitle: renderTemplate(effectiveTemplate.subtitle, templateVariables, { html: true }),
    body: renderTemplate(effectiveTemplate.body, templateVariables, { html: true }),
    signature: renderTemplate(effectiveTemplate.signature || EMAIL_SIGNATURE, templateVariables, { html: true }),
    buttonText: renderTemplate(effectiveTemplate.button_text, templateVariables),
    buttonUrl: renderTemplate(effectiveTemplate.button_url, templateVariables),
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": eventKey.slice(0, 256),
    },
    body: JSON.stringify({ from: environment.emailFrom, to: [recipient], subject, html, headers: { "X-Entity-Ref-ID": eventKey } }),
  });
  if (!response.ok) throw new Error(`Resend indisponível (${response.status}).`);
  const payload = await response.json().catch(() => ({}));
  await client.from("email_delivery_logs").insert({ recipient, template_id: templateId, preference_id: preferenceId, event_key: eventKey, priority: effectivePriority, status: "sent", provider_message_id: payload.id || null, sent_at: new Date().toISOString() });
  return { sent: true, id: payload.id };
}

export async function processOutbox(client: AdminClient, worker: string, limit = 50) {
  const { data: jobs, error } = await client.rpc("claim_automation_email_outbox", { batch_size: limit, worker_name: worker });
  if (error) throw error;
  const results = [];
  for (const job of jobs || []) {
    try {
      let recipients = [{ admin_user_id: null, recipient: job.recipient }];
      if (job.metadata?.requires_admin_email) {
        const fallback = getEmailEnvironment().adminEmail;
        if (!fallback) throw new Error("THAIS_ADMIN_EMAIL não configurado.");
        const { data, error: recipientError } = await client.rpc("get_admin_email_recipients", { fallback_email: fallback });
        if (recipientError) throw recipientError;
        recipients = data?.length ? data : [{ admin_user_id: null, recipient: fallback }];
        if (job.metadata?.requires_daily_summary_email && recipients.some((target) => target.admin_user_id)) {
          const ids = recipients.flatMap((target) => target.admin_user_id ? [target.admin_user_id] : []);
          const { data: dailyPreferences, error: dailyPreferenceError } = await client
            .from("admin_notification_preferences")
            .select("admin_user_id,daily_summary_email_enabled")
            .in("admin_user_id", ids);
          if (dailyPreferenceError) throw dailyPreferenceError;
          const enabled = new Set((dailyPreferences || []).filter((item) => item.daily_summary_email_enabled).map((item) => item.admin_user_id));
          recipients = recipients.filter((target) => target.admin_user_id && enabled.has(target.admin_user_id));
        }
      }
      const deliveries = [];
      for (const target of recipients) {
        let variables = job.variables || {};
        if (job.metadata?.kind === "daily_summary" && target.admin_user_id) {
          const { data: account } = await client.auth.admin.getUserById(target.admin_user_id);
          const fullName = account?.user?.user_metadata?.full_name || account?.user?.user_metadata?.name;
          variables = { ...variables, customer_name: fullName?.trim()?.split(/\s+/)[0] || "Administradora" };
        }
        deliveries.push(await sendTemplateEmail({
          client,
          recipient: target.recipient,
          templateId: job.template_id,
          preferenceId: job.preference_id,
          variables,
          eventKey: job.metadata?.kind === "daily_summary" ? `daily-summary:${target.admin_user_id || "fallback"}:${String(job.event_key).replace("daily-summary:", "")}` : job.metadata?.requires_admin_email ? `${job.event_key}:${target.admin_user_id || "fallback"}` : job.event_key,
          priority: job.priority,
        }));
      }
      const sent = deliveries.some((delivery) => delivery.sent);
      const skipped = deliveries.every((delivery) => delivery.skipped);
      await client.rpc("complete_automation_email", { job_id: job.id, was_sent: sent, error_text: skipped ? "disabled" : null });
      results.push({ id: job.id, sent, skipped, deliveries: deliveries.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`[${worker}] Falha no evento ${job.event_key}: ${message}`);
      await client.from("email_delivery_logs").insert({ recipient: job.recipient, template_id: job.template_id, preference_id: job.preference_id, event_key: job.event_key, priority: job.priority, status: "error", error_message: message });
      await client.rpc("complete_automation_email", { job_id: job.id, was_sent: false, error_text: message });
      results.push({ id: job.id, sent: false, error: message });
    }
  }
  return results;
}
