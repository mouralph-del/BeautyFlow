import { supabase } from "../lib/supabase";

const dateKey = (date) => {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
};

export async function getAdminAgenda(start, end) {
  const [appointmentsResult, blocksResult, hoursResult, holidaysResult] = await Promise.all([
    supabase.from("appointments")
      .select("id, customer_name, phone, email, notes, appointment_date, appointment_time, end_time, duration_minutes, total_duration_minutes, status, payment_status, reservation_paid, service_price, reservation_amount, remaining_amount, completed_at, no_show_at, no_show_reason, created_at")
      .gte("appointment_date", dateKey(start)).lte("appointment_date", dateKey(end))
      .order("appointment_date").order("appointment_time"),
    supabase.from("agenda_blocks").select("*")
      .gte("block_date", dateKey(start)).lte("block_date", dateKey(end))
      .order("block_date").order("start_time"),
    supabase.from("special_schedule_hours").select("*").eq("is_active", true),
    supabase.from("holidays").select("id,name,holiday_date,admin_decision,is_active").eq("is_active",true).gte("holiday_date",dateKey(start)).lte("holiday_date",dateKey(end)),
  ]);

  const firstError = appointmentsResult.error || blocksResult.error || hoursResult.error || holidaysResult.error;
  if (firstError) throw firstError;

  const ids = (appointmentsResult.data ?? []).map(({ id }) => id);
  let appointmentServices = [];
  if (ids.length) {
    const result = await supabase.from("appointment_services").select("*").in("appointment_id", ids);
    if (result.error) throw result.error;
    appointmentServices = result.data ?? [];
  }
  const grouped = appointmentServices.reduce((map, item) => {
    map[item.appointment_id] = [...(map[item.appointment_id] ?? []), item];
    return map;
  }, {});

  return {
    appointments: (appointmentsResult.data ?? []).map((item) => ({ ...item, services: grouped[item.id] ?? [] })),
    blocks: blocksResult.data ?? [],
    specialHours: hoursResult.data ?? [],
    holidays: holidaysResult.data ?? [],
  };
}

export async function getAdminHolidays(from, to) { const { data,error }=await supabase.rpc("admin_get_holidays",{date_from:from,date_to:to}); if(error)throw error; return data??[]; }
export async function saveAdminHoliday(payload,id=null) { const {data,error}=await supabase.rpc("admin_save_holiday",{payload,target_id:id}); if(error)throw error; return data; }
export async function setAdminHolidayActive(id,isActive) { const {error}=await supabase.rpc("admin_set_holiday_active",{target_id:id,active_value:isActive}); if(error)throw error; }
export async function finalizeAppointment(payload) { const {data,error}=await supabase.rpc("admin_finalize_appointment",{payload}); if(error)throw error; return data; }

export async function createAgendaBlock(values) {
  const { error } = await supabase.from("agenda_blocks").insert(values);
  if (error) throw error;
}

export async function createSpecialSchedule(values) {
  let existingQuery = supabase.from("special_schedule_hours").select("id").limit(1);
  existingQuery = values.special_date
    ? existingQuery.eq("special_date", values.special_date)
    : existingQuery.eq("weekday", values.weekday);
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
  if (lookupError) throw lookupError;
  const query = existing
    ? supabase.from("special_schedule_hours").update(values).eq("id", existing.id)
    : supabase.from("special_schedule_hours").insert(values);
  const { error } = await query;
  if (error) throw error;
}

export async function updateAppointment(id, values) {
  const { error } = await supabase.from("appointments").update(values).eq("id", id);
  if (error) throw error;
}

export async function createManualAppointment(appointment, services) {
  const { data, error } = await supabase.rpc("admin_create_manual_appointment", {
    payload: appointment,
    services_payload: services,
  });
  if (error) throw error;
  return data;
}
