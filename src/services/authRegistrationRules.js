export const SIGN_UP_MESSAGES = {
  weakPassword: "Crie uma senha com pelo menos 8 caracteres, uma letra e um número.",
  invalidEmail: "Informe um endereço de e-mail válido.",
  rateLimit: "Você fez várias tentativas em pouco tempo. Aguarde um momento e tente novamente.",
  network: "Não foi possível concluir o cadastro agora. Verifique sua conexão e tente novamente.",
  unknown: "Não foi possível criar sua conta. Tente novamente em alguns instantes.",
};

export const isValidRegistrationEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
export const isStrongRegistrationPassword = (password) => String(password || "").length >= 8 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);

export function getSignUpError(authError) {
  const code = typeof authError?.code === "string" ? authError.code.toLowerCase() : "";
  const message = typeof authError?.message === "string" ? authError.message.toLowerCase() : "";
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")) return { type: "existing-account", field: "email" };
  if (code === "weak_password" || message.includes("weak password") || message.includes("password should")) return { type: "error", field: "password", message: SIGN_UP_MESSAGES.weakPassword };
  if (code.includes("email") || message.includes("invalid email") || message.includes("email address")) return { type: "error", field: "email", message: SIGN_UP_MESSAGES.invalidEmail };
  if (code.includes("rate") || message.includes("rate limit") || message.includes("too many")) return { type: "error", field: null, message: SIGN_UP_MESSAGES.rateLimit };
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) return { type: "error", field: null, message: SIGN_UP_MESSAGES.network };
  return { type: "error", field: null, message: SIGN_UP_MESSAGES.unknown };
}
