import { supabase } from "../lib/supabase";

const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = (request) =>
  Promise.race([
    request,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), REQUEST_TIMEOUT_MS);
    }),
  ]);

export const getPasswordRecoveryRedirectUrl = () => {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
  return `${configuredSiteUrl || window.location.origin}/nova-senha`;
};

export const requestPasswordRecovery = async (email) => {
  const result = await withTimeout(
    supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordRecoveryRedirectUrl(),
    }),
  );
  if (result.error) throw result.error;
};

export const updateRecoveredPassword = async (password) => {
  const result = await withTimeout(supabase.auth.updateUser({ password }));
  if (result.error) throw result.error;
  await supabase.auth.signOut({ scope: "global" });
};

export const getRecoveryErrorMessage = (error) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (message === "request_timeout") {
    return "A solicitação demorou mais que o esperado. Verifique sua conexão e tente novamente.";
  }
  if (code.includes("rate") || message.includes("rate limit") || message.includes("too many")) {
    return "Muitas tentativas foram realizadas. Aguarde alguns minutos e tente novamente.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }
  if (message.includes("expired") || message.includes("invalid") || message.includes("otp")) {
    return "Este link expirou ou é inválido.";
  }
  return "Não foi possível concluir a solicitação. Tente novamente em alguns instantes.";
};
