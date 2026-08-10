import { useMemo, useState } from "react";
import {
  format,
  getDay,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMonthCells, WEEKDAYS_PT_BR } from "../../utils/calendar";

import {
  getBusinessHours,
  isTimeAvailable,
  minutesToTime,
} from "../../utils/timeUtils";

const VISIBLE_STATUSES = new Set([
  "aguardando_pagamento",
  "aguardando_aprovacao",
  "confirmado",
  "aprovado",
  "cancelado",
]);

const VISIBLE_PAYMENT_STATUSES = new Set([
  "aguardando_pagamento",
  "em_analise",
  "aprovado",
]);

const STATUS_LABELS = {
  aguardando_pagamento: "Aguardando pagamento",
  em_analise: "Pagamento em análise",
  aprovado: "Confirmado",
  confirmado: "Confirmado",
  recusado: "Pagamento recusado",
  cancelado: "Cancelado",
};

const toBookedAppointment = (appointment) => ({
  time: appointment.appointment_time.slice(0, 5),
  durationMinutes:
    appointment.total_duration_minutes || appointment.duration_minutes || 30,
});

function CalendarAvailability({
  appointments,
  bookingRequests = [],
  referenceDate,
  minimumServiceDuration,
}) {
  const [selectedDate, setSelectedDate] = useState(referenceDate);
  const today = useMemo(() => startOfDay(new Date()), []);
  const calendarCells = getMonthCells(referenceDate.getFullYear(), referenceDate.getMonth());

  const appointmentsByDate = useMemo(
    () =>
      appointments.reduce((result, appointment) => {
        const key = appointment.appointment_date;
        result[key] = [...(result[key] ?? []), appointment];
        return result;
      }, {}),
    [appointments]
  );

  const getDayAvailability = (day) => {
    const weekday = getDay(day);

    if (weekday === 0 || weekday === 4) {
      return { status: "closed", availableTimes: [] };
    }

    if (isBefore(startOfDay(day), today)) {
      return { status: "unavailable", availableTimes: [] };
    }

    const businessHours = getBusinessHours(day);
    const dateKey = format(day, "yyyy-MM-dd");
    const bookedAppointments = (appointmentsByDate[dateKey] ?? [])
      .filter((appointment) => appointment.status !== "cancelado")
      .map(toBookedAppointment);
    const availableTimes = [];

    for (let minutes = businessHours.opening; minutes < businessHours.closing; minutes += 30) {
      const time = minutesToTime(minutes);

      if (isTimeAvailable({
        startTime: time,
        durationMinutes: minimumServiceDuration,
        selectedDate: day,
        bookedAppointments,
      })) {
        availableTimes.push(time);
      }
    }

    if (availableTimes.length === 0) return { status: "unavailable", availableTimes };
    if (availableTimes.length <= 3) return { status: "limited", availableTimes };
    return { status: "available", availableTimes };
  };

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedAppointments = (appointmentsByDate[selectedDateKey] ?? [])
    .filter(
      (appointment) =>
        VISIBLE_STATUSES.has(appointment.status) ||
        VISIBLE_PAYMENT_STATUSES.has(appointment.payment_status)
    )
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const selectedRequests = bookingRequests
    .filter((request) => request.appointment_date === selectedDateKey)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  return (
    <section className="admin-section calendar-summary">
      <div className="admin-section__heading">
        <div><span>CALENDÁRIO</span><h2>Resumo da agenda</h2></div>
        <strong>{format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })}</strong>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS_PT_BR.map((day) => (
          <span key={day} title={day}>{day.slice(0, 3)}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarCells.map((day, index) => {
          if (!day) return <span aria-hidden="true" key={`empty-${index}`} />;
          const { status } = getDayAvailability(day);
          const currentDay = isSameDay(day, today);
          const selected = isSameDay(day, selectedDate);

          return (
            <button
              type="button"
              key={day.toISOString()}
              className={`calendar-day ${status} ${currentDay ? "today" : ""} ${selected ? "selected" : ""}`}
              aria-label={`${format(day, "dd/MM")}, ${status}`}
              aria-pressed={selected}
              onClick={() => setSelectedDate(day)}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span className="available">Disponível</span>
        <span className="limited">Poucas vagas</span>
        <span className="unavailable">Indisponível</span>
        <span className="closed">Fechado</span>
      </div>

      <div className="calendar-day-schedule">
        <h3>Horários do dia</h3>
        <p>{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>

        {selectedAppointments.length === 0 && selectedRequests.length === 0 ? (
          <span>Nenhuma cliente agendada para este dia.</span>
        ) : (
          <div>
            {selectedAppointments.map((appointment) => (
              <article key={appointment.id}>
                <strong>{appointment.appointment_time.slice(0, 5)}</strong>
                <span>{appointment.customer_name}</span>
                <small>
                  {appointment.status === "cancelado"
                    ? STATUS_LABELS.cancelado
                    : STATUS_LABELS[appointment.payment_status] ||
                      STATUS_LABELS[appointment.status] ||
                      appointment.status}
                </small>
              </article>
            ))}
            {selectedRequests.map((request) => (
              <article key={`request-${request.id}`}>
                <strong>{request.appointment_time.slice(0, 5)}</strong>
                <span>{request.customer_name}</span>
                <small>Aguardando aprovação do horário</small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CalendarAvailability;
