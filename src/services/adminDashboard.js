import { supabase } from "../lib/supabase";

const startOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const formatDatabaseDate = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const queryOrWarning = async (query, label, warnings) => {
  const { data, error } = await query;

  if (error) {
    warnings.push(`${label}: ${error.message}`);
    return [];
  }

  return data ?? [];
};

export const getAdminDashboardData = async (referenceDate = new Date()) => {
  const warnings = [];
  const monthStart = formatDatabaseDate(startOfMonth(referenceDate));
  const monthEnd = formatDatabaseDate(endOfMonth(referenceDate));

  const [
    appointments,
    appointmentServices,
    bookingRequests,
    notifications,
    dailyExperience,
  ] =
    await Promise.all([
      queryOrWarning(
        supabase
          .from("appointments")
          .select(
            "id, customer_name, phone, email, appointment_date, appointment_time, duration_minutes, total_duration_minutes, status, payment_status, reservation_amount, reservation_paid"
          )
          .gte("appointment_date", monthStart)
          .lte("appointment_date", monthEnd)
          .order("appointment_date")
          .order("appointment_time"),
        "Agendamentos",
        warnings
      ),
      queryOrWarning(
        supabase
          .from("appointment_services")
          .select(
            "appointment_id, service_id, service_name, duration_minutes, service_price, reservation_amount"
          ),
        "Serviços dos agendamentos",
        warnings
      ),
      queryOrWarning(
        supabase
          .from("booking_requests")
          .select(
            "id, service_name, customer_name, phone, email, appointment_date, appointment_time"
          )
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true }),
        "Solicitações",
        warnings
      ),
      queryOrWarning(
        supabase
          .from("admin_notifications")
          .select("id, appointment_id, type, title, message, read_at, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        "Notificações administrativas",
        warnings
      ),
      supabase.rpc("get_admin_daily_experience").then(({ data, error }) => {
        if (error) {
          warnings.push(`Experiência diária: ${error.message}`);
          return null;
        }
        return data;
      }),
    ]);

  const servicesByAppointment = appointmentServices.reduce(
    (result, service) => {
      const key = String(service.appointment_id);
      result[key] = [...(result[key] ?? []), service];
      return result;
    },
    {}
  );

  return {
    appointments: appointments.map((appointment) => ({
      ...appointment,
      services: servicesByAppointment[String(appointment.id)] ?? [],
    })),
    bookingRequests,
    notifications,
    warnings,
    period: {
      start: monthStart,
      end: monthEnd,
    },
    dailySummary: dailyExperience?.summary ?? null,
    dailyVerse: dailyExperience?.morning_verse ?? null,
    closingVerse: dailyExperience?.closing_verse ?? null,
    dailyPreferences: dailyExperience?.preferences ?? null,
  };
};

export const closeAdminDay = async (keepPending = false) => {
  const { data, error } = await supabase.rpc("review_admin_day", {
    keep_pending: keepPending,
  });
  if (error) throw error;
  return data;
};
