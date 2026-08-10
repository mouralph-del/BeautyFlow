import { supabase } from "../lib/supabase.js";
export { getSignUpError, isStrongRegistrationPassword, isValidRegistrationEmail, SIGN_UP_MESSAGES } from "./authRegistrationRules.js";

export async function registerCustomer({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
  if (error) throw error;
  if (data.user?.identities?.length === 0) {
    const existingError = new Error("existing-account");
    existingError.code = "user_already_exists";
    throw existingError;
  }
  return data;
}
