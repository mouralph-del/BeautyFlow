import { supabase } from "../lib/supabase";

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const mapServiceRecord = (record, details = {}) => ({
  ...details,
  dbId: record.id,
  id: record.legacy_id ?? record.id,
  slug: record.slug,
  title: record.name,
  category: record.category,
  description: record.full_description || record.short_description,
  shortDescription: record.short_description,
  duration: record.duration_label || `${record.duration_minutes} minutos`,
  durationMinutes: record.duration_minutes,
  price: money(record.price),
  priceValue: Number(record.price),
  reservationFee: money(record.reservation_amount),
  reservationFeeValue: Number(record.reservation_amount),
  remainingValue: money(Number(record.price) - Number(record.reservation_amount)),
  active: record.is_active,
  featured: record.is_featured,
  displayOrder: record.display_order,
  cardTitle: record.card_title,
  subtitle: record.subtitle,
  importantInformation: record.important_information,
  paymentNotice: record.payment_notice,
  creditCardFeeNotice: record.credit_card_fee_notice,
  image: record.image_url,
});

export async function getServiceRecords({ admin = false } = {}) {
  let query = supabase.from("services").select("*").order("display_order").order("name");
  if (!admin) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveService(values, id) {
  const payload = {
    slug: values.slug.trim(), name: values.name.trim(), category: values.category.trim(),
    short_description: values.short_description.trim(), full_description: values.full_description.trim(),
    duration_label: values.duration_label.trim(), duration_minutes: Number(values.duration_minutes),
    price: Number(values.price), reservation_amount: Number(values.reservation_amount),
    is_active: values.is_active, is_featured: values.is_featured,
    display_order: Number(values.display_order), card_title: values.card_title || null,
    subtitle: values.subtitle || null, important_information: values.important_information || null,
    payment_notice: values.payment_notice, credit_card_fee_notice: values.credit_card_fee_notice,
    image_url: values.image_url || null, updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from("services").update(payload).eq("id", id)
    : supabase.from("services").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function setServiceActive(id, isActive) {
  const { error } = await supabase.from("services").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteService(service) {
  const serviceId = service.legacy_id ?? service.id;
  const { count, error: historyError } = await supabase
    .from("appointment_services")
    .select("appointment_id", { count: "exact", head: true })
    .eq("service_id", serviceId);
  if (historyError) throw historyError;
  if (count > 0) {
    await setServiceActive(service.id, false);
    return "paused";
  }
  const { error } = await supabase.from("services").delete().eq("id", service.id);
  if (error) throw error;
  return "deleted";
}
