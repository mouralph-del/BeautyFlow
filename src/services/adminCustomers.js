import { supabase } from "../lib/supabase";

export async function getAdminCustomers({ page = 1, pageSize = 20, search = "", filter = "all", sort = "recent" } = {}) {
  const { data, error } = await supabase.rpc("get_admin_customers", {
    page_number: page, page_size: pageSize, search_text: search || null,
    filter_name: filter, sort_name: sort,
  });
  if (error) throw error;
  return data ?? { clients: [], total: 0, metrics: {} };
}

export async function addCustomerNote(customer, note) {
  const { data, error } = await supabase.rpc("admin_add_customer_note", {
    target_identity: customer.identity_key, note_text: note,
    target_user: customer.user_id || null, target_email: customer.email || null,
    target_phone: customer.phone || null,
  });
  if (error) throw error;
  return data;
}

export async function setCustomerActive(customer, active, reason = "") {
  if (!customer.user_id) throw new Error("Clientes visitantes não possuem cadastro para desativar.");
  const { error } = await supabase.rpc("admin_set_customer_active", {
    target_user: customer.user_id, active_value: active, reason_text: reason || null,
  });
  if (error) throw error;
}

export async function linkCurrentCustomerHistory() {
  const { data, error } = await supabase.rpc("link_customer_history");
  if (error) throw error;
  return data;
}
