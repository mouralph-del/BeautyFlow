import { supabase } from "../lib/supabase";

export const promotionStatus = (promotion) => {
  const now = new Date();
  if (promotion.status === "ended") return "ended";
  if (promotion.status === "paused") return "paused";
  if (promotion.ends_at && new Date(promotion.ends_at) < now) return "expired";
  if (promotion.starts_at && new Date(promotion.starts_at) > now) return "scheduled";
  return promotion.status;
};

export async function getAdminPromotions() {
  const [{ data, error }, { data: services, error: serviceError }] = await Promise.all([
    supabase.from("promotions").select("*, promotion_services(service_id), promotion_activity(id,action,details,created_at,performed_by)").order("created_at", { ascending: false }),
    supabase.from("services").select("id,name,price,reservation_amount,is_active").eq("is_active", true).order("name"),
  ]);
  if (error) throw error;
  if (serviceError) throw serviceError;
  return { promotions: data ?? [], services: services ?? [] };
}

export async function savePromotion(values, id) {
  const { data, error } = await supabase.rpc("admin_save_promotion", { payload: values, target_id: id || null });
  if (error) throw error;
  return data;
}

export async function changePromotionStatus(id, status) {
  const { error } = await supabase.rpc("admin_change_promotion", { target_id: id, new_status: status });
  if (error) throw error;
}

export async function duplicatePromotion(id) {
  const { error } = await supabase.rpc("admin_duplicate_promotion", { target_id: id });
  if (error) throw error;
}

export async function deletePromotion(promotion) {
  if (Number(promotion.usage_count) > 0 || promotion.status !== "draft") {
    throw new Error("Promoções com histórico só podem ser pausadas ou encerradas.");
  }
  const { error } = await supabase.from("promotions").delete().eq("id", promotion.id);
  if (error) throw error;
}

export async function getActivePromotions(target = "services") {
  const { data, error } = await supabase.rpc("get_active_promotions", { target });
  if (error) throw error;
  return data ?? [];
}

export function calculatePromotion(price, promotion) {
  const original = Number(price || 0);
  let final = original;
  if (promotion.discount_type === "percentage") final = original * (1 - Number(promotion.discount_value || 0) / 100);
  if (promotion.discount_type === "fixed") final = original - Number(promotion.discount_value || 0);
  if (promotion.discount_type === "promotional_price") final = Number(promotion.promotional_price || 0);
  final = Math.max(0, final);
  return { original, final, saving: Math.max(0, original - final) };
}
