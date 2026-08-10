import { supabase } from "../lib/supabase";

export const getMonthlySchedule = async (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const { data, error } = await supabase
    .from("monthly_schedule_releases")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const saveMonthlyScheduleDraft = async (date, values) => {
  const payload = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    status: values.status ?? "draft",
    blocked_dates: values.blocked_dates ?? [],
    special_hours: values.special_hours ?? {},
    admin_notes: values.admin_notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (values.released_at !== undefined) payload.released_at = values.released_at;
  if (values.released_by !== undefined) payload.released_by = values.released_by;
  if (values.released_by_name !== undefined) payload.released_by_name = values.released_by_name;
  const { data, error } = await supabase
    .from("monthly_schedule_releases")
    .upsert(payload, { onConflict: "year,month" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};

export const releaseMonthlySchedule = async (date, values, userName) => {
  const { data, error } = await supabase.rpc("release_monthly_schedule", {
    target_year: date.getFullYear(),
    target_month: date.getMonth() + 1,
    target_blocked_dates: values.blocked_dates ?? [],
    target_special_hours: values.special_hours ?? {},
    target_admin_notes: values.admin_notes?.trim() || null,
    target_released_by_name: userName,
  });

  if (error) throw error;
  return data;
};

export const getReleasedSchedules = async () => {
  const { data, error } = await supabase
    .from("monthly_schedule_releases")
    .select("year, month, blocked_dates, special_hours")
    .eq("status", "released");
  if (error) throw error;
  return data ?? [];
};
