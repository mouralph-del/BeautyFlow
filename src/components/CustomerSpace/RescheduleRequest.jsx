import { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock3, X } from "lucide-react";

import "react-datepicker/dist/react-datepicker.css";
import Modal from "../Modal/Modal";
import usePublicSettings from "../../hooks/usePublicSettings";
import { getReleasedSchedules } from "../../services/monthlySchedule";
import {
  cancelRescheduleRequest,
  createRescheduleRequest,
  getRescheduleBookedAppointments,
  getRescheduleErrorMessage,
  respondToRescheduleProposal,
} from "../../services/rescheduleRequests";
import { getPublicDayAvailability } from "../../services/settings";
import { getTimeSlotStatus, minutesToTime, timeToMinutes } from "../../utils/timeUtils";
import "./RescheduleRequest.css";

registerLocale("pt-BR", ptBR);

const ACTIVE_STATUSES = ["pendente", "aguardando_resposta_cliente", "proposta_recusada"];
const STATUS_LABELS = {
  pendente: "Aguardando análise",
  aguardando_resposta_cliente: "Aguardando sua resposta",
  aprovado: "Remarcação aprovada",
  recusado: "Solicitação recusada",
  cancelado_cliente: "Solicitação cancelada",
  proposta_recusada: "Proposta não aceita",
};

const formatDatabaseDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDisplayDate = (date) => {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
};

const isPastTime = (date, time) => {
  const value = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  value.setHours(hours, minutes, 0, 0);
  return value <= new Date();
};

export default function RescheduleRequest({ appointment, request, onChanged }) {
  const settings = usePublicSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [releasedSchedules, setReleasedSchedules] = useState([]);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [dayAvailability, setDayAvailability] = useState({ special_hours: null, blocks: [] });
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    getReleasedSchedules().then(setReleasedSchedules).catch(() => setReleasedSchedules([]));
  }, [isOpen]);

  useEffect(() => {
    if (!selectedDate) {
      setBookedAppointments([]);
      setDayAvailability({ special_hours: null, blocks: [] });
      return;
    }

    let active = true;
    setLoadingAvailability(true);
    const date = formatDatabaseDate(selectedDate);
    Promise.all([
      getPublicDayAvailability(date),
      getRescheduleBookedAppointments(date, appointment?.id),
    ])
      .then(([availability, booked]) => {
        if (!active) return;
        setDayAvailability(availability);
        setBookedAppointments(booked);
      })
      .catch(() => {
        if (!active) return;
        console.error("Não foi possível carregar a disponibilidade para remarcação.");
        setError("Não foi possível carregar os horários desta data.");
      })
      .finally(() => active && setLoadingAvailability(false));

    return () => { active = false; };
  }, [appointment?.id, selectedDate]);

  const selectedRelease = selectedDate
    ? releasedSchedules.find((item) => item.year === selectedDate.getFullYear() && item.month === selectedDate.getMonth() + 1)
    : null;
  const dateKey = selectedDate ? formatDatabaseDate(selectedDate) : "";
  const specialHours = selectedRelease?.special_hours?.[dateKey];
  const configuredDay = selectedDate ? settings.schedule.days?.[String(selectedDate.getDay())] : null;
  const activeSchedule = specialHours ?? dayAvailability.special_hours ?? configuredDay;

  const availableTimes = useMemo(() => {
    if (!selectedDate || !activeSchedule || (!activeSchedule.active && !specialHours && !dayAvailability.special_hours)) return [];
    const opening = activeSchedule.opening ?? activeSchedule.open;
    const closing = activeSchedule.closing ?? activeSchedule.close;
    if (!opening || !closing) return [];

    const result = [];
    for (
      let current = timeToMinutes(opening);
      current < timeToMinutes(closing);
      current += Number(settings.schedule.slot_interval) || 30
    ) {
      const time = minutesToTime(current);
      const status = getTimeSlotStatus({
        startTime: time,
        durationMinutes: appointment.durationMinutes,
        selectedDate,
        bookedAppointments,
        scheduleOverride: activeSchedule,
        blockedIntervals: dayAvailability.blocks,
      });
      if (status === "available" && !isPastTime(selectedDate, time)) result.push(time);
    }
    return result;
  }, [activeSchedule, appointment.durationMinutes, bookedAppointments, dayAvailability, selectedDate, settings.schedule.slot_interval, specialHours]);

  const isAvailableDay = (date) => {
    const release = releasedSchedules.find(
      (item) => item.year === date.getFullYear() && item.month === date.getMonth() + 1
    );
    const day = settings.schedule.days?.[String(date.getDay())];
    return Boolean(release) && Boolean(day?.active) && !(release.blocked_dates ?? []).includes(formatDatabaseDate(date));
  };

  const resetModal = () => {
    setIsOpen(false);
    setConfirmationOpen(false);
    setSelectedDate(null);
    setSelectedTime("");
    setReason("");
    setError("");
  };

  const submit = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Escolha uma nova data e um horário disponível.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createRescheduleRequest({
        appointmentId: appointment.id,
        date: formatDatabaseDate(selectedDate),
        time: selectedTime,
        reason,
      });
      resetModal();
      setSuccess("Solicitação de remarcação enviada. O horário original permanece reservado até a análise.");
      await onChanged();
    } catch (submitError) {
      setError(getRescheduleErrorMessage(submitError));
      setConfirmationOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const runRequestAction = async (action) => {
    setLoading(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (actionError) {
      setError(getRescheduleErrorMessage(actionError));
      await onChanged();
    } finally {
      setLoading(false);
    }
  };

  if (request && ACTIVE_STATUSES.includes(request.status)) {
    const awaitingProposal = request.status === "aguardando_resposta_cliente";
    return (
      <section className="customer-reschedule customer-reschedule--status">
        <div>
          <span className="customer-reschedule__eyebrow">Remarcação</span>
          <h2>{STATUS_LABELS[request.status]}</h2>
          <p>
            {awaitingProposal
              ? "A profissional sugeriu uma nova opção para o atendimento."
              : request.status === "proposta_recusada"
                ? "Sua resposta foi enviada. O pedido voltou para análise da profissional."
                : "Sua solicitação está sendo analisada. O horário original continua reservado."}
          </p>
          {success && <p className="customer-reschedule__success">{success}</p>}
          <dl className="customer-reschedule__details">
            <div><dt>Horário atual</dt><dd>{formatDisplayDate(request.original_date)} às {request.original_time?.slice(0, 5)}</dd></div>
            <div><dt>{awaitingProposal ? "Sugestão" : "Solicitado"}</dt><dd>{formatDisplayDate(awaitingProposal ? request.proposed_date : request.requested_date)} às {(awaitingProposal ? request.proposed_time : request.requested_time)?.slice(0, 5)}</dd></div>
            <div><dt>Pedido enviado</dt><dd>{new Date(request.created_at).toLocaleString("pt-BR")}</dd></div>
          </dl>
          {request.admin_message && <p className="customer-reschedule__message">{request.admin_message}</p>}
          {error && <p className="customer-reschedule__error">{error}</p>}
        </div>
        {request.status !== "proposta_recusada" && <div className="customer-reschedule__actions">
          {awaitingProposal ? (
            <>
              <button disabled={loading} onClick={() => runRequestAction(() => respondToRescheduleProposal(request.id, true))}>Aceitar novo horário</button>
              <button className="secondary" disabled={loading} onClick={() => runRequestAction(() => respondToRescheduleProposal(request.id, false))}>Não aceitar</button>
            </>
          ) : (
            <button className="secondary" disabled={loading} onClick={() => runRequestAction(() => cancelRescheduleRequest(request.id))}>Cancelar solicitação</button>
          )}
        </div>}
      </section>
    );
  }

  if (!appointment) {
    return <section className="customer-reschedule customer-reschedule--status"><div><span className="customer-reschedule__eyebrow">Remarcação</span><h2>Sua solicitação está em análise</h2><p>Aguardando definição da nova data. Assim que houver uma atualização, ela aparecerá aqui.</p></div></section>;
  }

  return (
    <>
      <section className="customer-reschedule">
        <div>
          <span className="customer-reschedule__eyebrow">Alteração de horário</span>
          <h2>Precisa remarcar?</h2>
          <p>Envie uma nova opção de data e horário para análise da profissional.</p>
          {request && <p className="customer-reschedule__history"><strong>{STATUS_LABELS[request.status] ?? request.status}.</strong> {request.admin_message || "O histórico da solicitação foi preservado."}</p>}
          {success && <p className="customer-reschedule__success">{success}</p>}
        </div>
        <button onClick={() => setIsOpen(true)}>Solicitar remarcação</button>
      </section>

      {isOpen && (
        <Modal isOpen={isOpen} onClose={resetModal} title="Escolha uma nova opção" describedBy="reschedule-desc" className="reschedule-modal-wrapper">
          <button className="reschedule-modal__close" type="button" onClick={resetModal} aria-label="Fechar"><X size={20} /></button>
          <span className="customer-reschedule__eyebrow">Solicitação de remarcação</span>
          <p id="reschedule-desc">Envie uma nova opção de data e horário para análise da profissional.</p>

          <div className="reschedule-modal__current">
            <strong>{appointment.services?.map((service) => service.name).join(" + ") || appointment.serviceName}</strong>
            <span><CalendarDays size={16} /> {formatDisplayDate(appointment.date)} às {appointment.time}</span>
            <span><Clock3 size={16} /> {appointment.durationMinutes} minutos</span>
            <span>Status: {appointment.status}</span>
            <span>Taxa de reserva: {Number(appointment.reservationAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            <small>Seu horário atual só será alterado depois da aprovação.</small>
          </div>

          <div className="reschedule-modal__calendar">
            <DatePicker selected={selectedDate} onChange={(date) => { setSelectedDate(date); setSelectedTime(""); setError(""); }} minDate={new Date()} filterDate={isAvailableDay} locale="pt-BR" inline />
          </div>

          {selectedDate && (
            <div className="reschedule-modal__times">
              <h3>Horários disponíveis</h3>
              {loadingAvailability ? <p>Carregando horários...</p> : availableTimes.length ? (
                <div className="reschedule-modal__times-grid">
                  {availableTimes.map((time) => <button type="button" key={time} className={selectedTime === time ? "selected" : ""} onClick={() => setSelectedTime(time)}>{time}</button>)}
                </div>
              ) : <p>Não há horários disponíveis para esta data.</p>}
            </div>
          )}

          <label className="reschedule-modal__reason">
            Motivo (opcional)
            <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={3} placeholder="Conte brevemente o motivo da alteração" />
            <small>{reason.length}/500</small>
          </label>
          {error && <p className="customer-reschedule__error">{error}</p>}

          {!confirmationOpen ? (
            <button className="reschedule-modal__submit" type="button" disabled={!selectedDate || !selectedTime} onClick={() => setConfirmationOpen(true)}>Continuar</button>
          ) : (
            <div className="reschedule-modal__confirmation">
              <p><strong>Confirmar solicitação de remarcação?</strong></p>
              <p>Horário atual: {formatDisplayDate(appointment.date)} às {appointment.time}</p>
              <p>Horário solicitado: {formatDisplayDate(dateKey)} às {selectedTime}</p>
              <p>Seu agendamento ainda não será alterado. A nova data e o novo horário dependem da confirmação do estúdio.</p>
              <div><button className="secondary" type="button" disabled={loading} onClick={() => setConfirmationOpen(false)}>Voltar</button><button type="button" disabled={loading} onClick={submit}>{loading ? "Enviando..." : "Enviar solicitação"}</button></div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
