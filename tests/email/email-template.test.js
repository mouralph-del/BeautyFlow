import test from "node:test";
import assert from "node:assert/strict";
import { renderEmailLayout, renderTemplate } from "../../supabase/functions/_shared/email-template.js";

test("renderiza layout oficial e link administrativo sem expor chave Pix", () => {
  const variables = { site_url: "https://studio.example", customer_name: "Ana <Teste>" };
  const html = renderEmailLayout({ title: "Pagamento recebido", subtitle: "Aguardando análise", body: renderTemplate("<p>Cliente: {{customer_name}}</p>", variables, { html: true }), buttonText: "Analisar pagamento", buttonUrl: renderTemplate("{{site_url}}/admin/solicitacoes?tab=pagamentos", variables) });
  assert.match(html, /background:#f5eee8/);
  assert.match(html, /Thaís Santos Beauty Studio/);
  assert.match(html, /\/admin\/solicitacoes\?tab=pagamentos/);
  assert.doesNotMatch(html, /[?&]request=/);
  assert.match(html, /Ana &lt;Teste&gt;/);
  assert.doesNotMatch(html, /chave pix|pix_key|payment_proof/i);
});

test("layout aceita fallback sem subtítulo nem botão", () => {
  const html = renderEmailLayout({ title: "Aviso", body: "<p>Conteúdo</p>" });
  assert.match(html, /Conteúdo/);
  assert.doesNotMatch(html, /<a href=/);
});
