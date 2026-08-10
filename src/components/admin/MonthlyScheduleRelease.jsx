import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  getMonthlySchedule,
  releaseMonthlySchedule,
  saveMonthlyScheduleDraft,
} from "../../services/monthlySchedule";
import { useAuth } from "../../contexts/useAuth";
import { getUserDisplayName } from "../../utils/authUser";
import { getMonthCells, WEEKDAYS_PT_BR } from "../../utils/calendar";
import Modal from "../Modal/Modal";

const monthLabel = (date) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function MonthlyScheduleRelease({ date, onChanged, reviewSignal = 0 }) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [specialHours, setSpecialHours] = useState({});
  const [specialDate, setSpecialDate] = useState("");
  const [specialForm, setSpecialForm] = useState({ opening: "08:00", breakStart: "12:00", breakEnd: "13:30", closing: "18:00" });
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const days = useMemo(() => {
    const result = [];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day += 1) {
      result.push(new Date(date.getFullYear(), date.getMonth(), day));
    }
    return result;
  }, [date]);

  const availableDays = days.filter(
    (day) => ![0, 4].includes(day.getDay()) && !blockedDates.includes(dateKey(day))
  ).length;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getMonthlySchedule(date)
      .then((result) => {
        if (!active) return;
        setSchedule(result);
        setBlockedDates(result?.blocked_dates ?? []);
        setSpecialHours(result?.special_hours ?? {});
        setNotes(result?.admin_notes ?? "");
      })
      .catch(() => {
        if (!active) return;
        console.error("Não foi possível carregar a liberação mensal.");
        setError("Não foi possível consultar a agenda do próximo mês.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  useEffect(() => {
    if (reviewSignal > 0) setOpen(true);
  }, [reviewSignal]);

  const values = { blocked_dates: blockedDates, special_hours: specialHours, admin_notes: notes };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await saveMonthlyScheduleDraft(date, {
        ...values,
        status: schedule?.status ?? "draft",
      });
      setSchedule(result);
      setOpen(false);
      onChanged?.();
    } catch {
      console.error("Não foi possível salvar a revisão da agenda.");
      setError("Não foi possível salvar a revisão da agenda.");
    } finally {
      setSaving(false);
    }
  };

  const configurationValid = useMemo(() => {
    return Object.values(specialHours).every((hours) =>
      hours.opening &&
      hours.breakStart &&
      hours.breakEnd &&
      hours.closing &&
      hours.opening < hours.breakStart &&
      hours.breakStart < hours.breakEnd &&
      hours.breakEnd < hours.closing
    );
  }, [specialHours]);

  const getReleaseErrorMessage = (releaseError) => {
    const code = releaseError?.code;
    const message = releaseError?.message?.toLowerCase() ?? "";
    if (code === "42501" || message.includes("administrador") || message.includes("permission")) {
      return "Sua sessão não possui permissão administrativa. Saia e entre novamente na conta de administradora.";
    }
    if (code === "22023" || code === "23514" || message.includes("invalid")) {
      return "A configuração da agenda está incompleta ou possui valores inválidos.";
    }
    if (message.includes("failed to fetch") || message.includes("network")) {
      return "Falha de conexão com o Supabase. Verifique sua internet e tente novamente.";
    }
    if (code === "23505") {
      return "Este mês já possui uma liberação. Atualize a página e tente novamente.";
    }
    return "Não foi possível liberar a agenda.";
  };

  const requestRelease = () => {
    setError("");
    setSuccessMessage("");
    if (!configurationValid) {
      setError("Revise os horários especiais: abertura, intervalo e fechamento precisam estar em ordem.");
      setOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const release = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await releaseMonthlySchedule(date, values, getUserDisplayName(user));
      setSchedule(result);
      setConfirmOpen(false);
      setOpen(false);
      setSuccessMessage(`Agenda de ${monthLabel(date)} liberada com sucesso.`);
      onChanged?.();
    } catch (releaseError) {
      console.error("Não foi possível liberar a agenda.");
      setError(getReleaseErrorMessage(releaseError));
    } finally {
      setSaving(false);
    }
  };

  const toggleDate = (day) => {
    const key = dateKey(day);
    setBlockedDates((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const addSpecialHours = () => {
    if (!specialDate) return;
    setSpecialHours((current) => ({ ...current, [specialDate]: specialForm }));
    setSpecialDate("");
  };

  const released = schedule?.status === "released";

  return (
    <section className="admin-section monthly-release-card" id="monthly-schedule">
      <div className="admin-section__heading">
        <div>
          <span>PLANEJAMENTO</span>
          <h2>Agenda do próximo mês</h2>
        </div>
      </div>

      {loading ? (
        <p>Carregando situação da agenda...</p>
      ) : (
        <>
          <h3>
            {released
              ? `Agenda de ${monthLabel(date)} liberada`
              : `${monthLabel(date)} ainda não foi liberado.`}
          </h3>
          <p>
            Revise os dias, horários e possíveis bloqueios antes de disponibilizar a agenda para novas clientes.
          </p>
          {released && (
            <dl className="monthly-release-details">
              <div><dt>Liberação</dt><dd>{new Date(schedule.released_at).toLocaleString("pt-BR")}</dd></div>
              <div><dt>Responsável</dt><dd>{schedule.released_by_name || "Administrador"}</dd></div>
              <div><dt>Dias disponíveis</dt><dd>{availableDays}</dd></div>
            </dl>
          )}
          {error && <p className="monthly-release-error">{error}</p>}
          {successMessage && <p className="monthly-release-success" role="status">{successMessage}</p>}
          <div className="monthly-release-actions">
            <button type="button" className="admin-action" onClick={() => setOpen(true)}>
              {released ? "Editar agenda" : "Revisar agenda"}
            </button>
            {released && <a className="admin-action" href="#agenda">Visualizar no calendário</a>}
            {!released && (
              <button type="button" className="admin-primary" disabled={saving} onClick={requestRelease}>
                {saving ? "Liberando..." : `Liberar agenda de ${date.toLocaleDateString("pt-BR", { month: "long" })}`}
              </button>
            )}
          </div>
        </>
      )}

      {open && (
          <Modal isOpen onClose={() => setOpen(false)} title={monthLabel(date)} className="schedule-review-modal" overlayClassName="schedule-review-overlay">
            <header>
              <div><span>REVISÃO</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button>
            </header>

            <div className="schedule-default-hours">
              <article><strong>Segunda, terça, quarta e sexta</strong><span>08:00–12:00 · 13:30–18:00</span></article>
              <article><strong>Sábado</strong><span>08:00–12:00 · 13:00–15:00</span></article>
              <article><strong>Fechado</strong><span>Quinta-feira e domingo</span></article>
            </div>

            <p className="schedule-review-help">Selecione uma data de funcionamento para bloqueá-la. Datas fechadas por padrão já aparecem desabilitadas.</p>
            <div className="schedule-review-calendar">
              <div className="schedule-review-weekdays">{WEEKDAYS_PT_BR.map((label) => <span key={label} title={label}>{label.slice(0,3)}</span>)}</div>
              <div className="schedule-review-days">
                {getMonthCells(date.getFullYear(),date.getMonth()).map((day,index) => {
                  if (!day) return <span key={`empty-${index}`} />;
                  const closed = [0, 4].includes(day.getDay());
                  const blocked = blockedDates.includes(dateKey(day));
                  return <button key={dateKey(day)} type="button" disabled={closed} className={blocked ? "blocked" : ""} onClick={() => toggleDate(day)}>{day.getDate()}</button>;
                })}
              </div>
            </div>

            <section className="schedule-special-hours">
              <h3>Horários especiais</h3>
              <div className="schedule-special-form">
                <label>Data<input type="date" min={dateKey(days[0])} max={dateKey(days[days.length - 1])} value={specialDate} onChange={(event) => setSpecialDate(event.target.value)} /></label>
                {[["opening", "Abertura"], ["breakStart", "Início do intervalo"], ["breakEnd", "Fim do intervalo"], ["closing", "Fechamento"]].map(([name, label]) => (
                  <label key={name}>{label}<input type="time" value={specialForm[name]} onChange={(event) => setSpecialForm((current) => ({ ...current, [name]: event.target.value }))} /></label>
                ))}
                <button type="button" className="admin-action" onClick={addSpecialHours}>Adicionar horário</button>
              </div>
              {Object.entries(specialHours).map(([key, hours]) => (
                <article key={key}><span>{new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR")}: {hours.opening}–{hours.breakStart} · {hours.breakEnd}–{hours.closing}</span><button type="button" onClick={() => setSpecialHours((current) => Object.fromEntries(Object.entries(current).filter(([dateValue]) => dateValue !== key)))}>Remover</button></article>
              ))}
            </section>

            <label className="schedule-notes">Observações administrativas<textarea rows="4" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            {error && <p className="monthly-release-error">{error}</p>}
            <footer>
              <button type="button" className="admin-action" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button>
              <button type="button" className="admin-action" disabled={saving} onClick={saveDraft}>Salvar revisão</button>
              <button type="button" className="admin-primary" disabled={saving} onClick={requestRelease}>Salvar e liberar</button>
            </footer>
          </Modal>
      )}

      {confirmOpen && (
          <Modal isOpen onClose={() => !saving && setConfirmOpen(false)} title={`Liberar agenda de ${monthLabel(date)}?`} describedBy="schedule-release-description" closeOnOverlayClick={!saving} closeOnEscape={!saving} className="schedule-release-confirm" overlayClassName="schedule-review-overlay">
            <span>CONFIRMAÇÃO</span>
            <p id="schedule-release-description">Após a confirmação, os dias e horários configurados ficarão disponíveis para novas clientes.</p>
            <dl>
              <div><dt>Mês</dt><dd>{monthLabel(date)}</dd></div>
              <div><dt>Dias de funcionamento</dt><dd>Segunda, terça, quarta, sexta e sábado</dd></div>
              <div><dt>Dias fechados</dt><dd>Quinta-feira e domingo</dd></div>
              <div><dt>Datas bloqueadas</dt><dd>{blockedDates.length || "Nenhuma"}</dd></div>
              <div><dt>Dias disponíveis</dt><dd>{availableDays}</dd></div>
            </dl>
            {error && <div className="schedule-release-error"><p>{error}</p><button type="button" disabled={saving} onClick={release}>Tentar novamente</button></div>}
            <footer>
              <button type="button" className="admin-action" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button type="button" className="admin-primary" disabled={saving} onClick={release}>{saving ? "Liberando agenda..." : "Confirmar e liberar agenda"}</button>
            </footer>
          </Modal>
      )}
    </section>
  );
}

export default MonthlyScheduleRelease;
