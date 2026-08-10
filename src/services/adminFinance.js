import { supabase } from "../lib/supabase";

export async function getFinancialData(from, to) {
  const { data, error } = await supabase.rpc("admin_get_financial_data", { date_from: from, date_to: to });
  if (error) throw error;
  return { appointments: data?.appointments ?? [], transactions: data?.transactions ?? [], expenses: data?.expenses ?? [], services: data?.services ?? [] };
}

export async function recordPayment(payload) {
  const { data, error } = await supabase.rpc("admin_record_payment", { payload });
  if (error) throw error;
  return data;
}

export async function saveExpense(payload, id) {
  const { data, error } = await supabase.rpc("admin_save_expense", { payload, target_id: id || null });
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase.rpc("admin_delete_expense", { target_id: id });
  if (error) throw error;
}
