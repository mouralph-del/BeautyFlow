import { test } from "@playwright/test";

const homologationEnabled = process.env.BEAUTY_STUDIO_E2E_HOMOLOGATION === "true";

test.describe("fluxos que alteram dados", () => {
  test.skip(!homologationEnabled, "Exige Supabase local ou homologação confirmada e isolada.");

  test.fixme("cadastro, login, agendamento, Pix e upload de comprovante", async () => {});
  test.fixme("aprovação e recusa administrativa com auditoria e idempotência", async () => {});
  test.fixme("cancelamento, remarcação e encaixe", async () => {});
  test.fixme("promoções, financeiro e configurações", async () => {});
  test.fixme("Ver site e Voltar ao painel permanecem na mesma aba", async () => {});
});
