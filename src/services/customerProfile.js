import { supabase } from "../lib/supabase";

export async function getOwnCustomerProfile() {
  const { data, error } = await supabase.rpc("get_own_customer_profile");
  if (error) throw error;
  return data;
}

export async function saveOwnCustomerProfile({ fullName, phone }) {
  const { data, error } = await supabase.rpc("save_own_customer_profile", {
    full_name_value: fullName.trim(),
    phone_value: phone.trim(),
  });
  if (error) throw error;
  return data;
}
