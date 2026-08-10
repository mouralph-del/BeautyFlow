import { supabase } from "../lib/supabase";

/**
 * @typedef {Object} CustomerAppointment
 * @property {number|string} id
 * @property {string} serviceName
 * @property {string} date
 * @property {string} time
 * @property {number} value
 * @property {string} status
 */

export async function getCustomerSpace() {
  const { data, error } = await supabase.rpc("get_customer_space");

  if (error) {
    console.error("Não foi possível carregar os atendimentos da cliente.");

    throw new Error(
      "Não foi possível carregar seus atendimentos agora. Tente novamente em instantes."
    );
  }

  return {
    appointments: data?.appointments ?? [],
    promotion: data?.promotion ?? null,
    reschedules: data?.reschedules ?? [],
    notifications: data?.notifications ?? [],
    fitRequests: data?.fitRequests ?? [],
  };
}
