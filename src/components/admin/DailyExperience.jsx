import { BookHeart, CalendarDays, CheckCircle2, MoonStar, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../Modal/Modal";
import { closeAdminDay } from "../../services/adminDashboard";
import { getClosingMessage, getGreeting, getMorningMessage } from "../../utils/dailyExperience";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const Stat = ({ label, value }) => <div><span>{label}</span><strong>{value}</strong></div>;

export default function DailyExperience({ data, name, now = new Date(), onClosed }) {
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const summary = data?.dailySummary;
  const preferences = data?.dailyPreferences || {};
  const pending = Number(summary?.payments_review || 0) + Number(summary?.reschedules || 0) + Number(summary?.fits || 0) + Number(summary?.awaiting_completion || 0);
  const facts = useMemo(() => [[summary?.appointments, "atendimentos hoje"], [summary?.payments_review, "pagamentos para analisar"], [summary?.reschedules, "remarcações pendentes"], [summary?.fits, "pedidos de encaixe"]].filter(([value]) => Number(value) > 0), [summary]);
  if (!summary) return null;
  const formattedDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" }).format(now);
  const confirmReview = async (keepPending) => { setSaving(true); setError(""); try { await closeAdminDay(keepPending); setReviewing(false); onClosed?.(); } catch (cause) { setError(cause.message || "Não foi possível registrar a revisão."); } finally { setSaving(false); } };

  return <>
    <section className="daily-experience" aria-labelledby="daily-title">
      <div className="daily-experience__intro"><span>SEU DIA NO BEAUTY STUDIO</span><h1 id="daily-title">{getGreeting(now, name)}</h1><p>{getMorningMessage({ date: now, appointments: summary.appointments, pending })}</p><time>{formattedDate}</time></div>
      <div className="daily-experience__summary"><CalendarDays /><div><h2>Seu dia no Beauty Studio</h2>{facts.length ? <p>Hoje: {facts.map(([value, label]) => `${value} ${label}`).join(", ")}.</p> : <p>Não há atendimentos ou pendências para hoje.</p>}{summary.next_appointment && <small>Próximo atendimento às {summary.next_appointment}.</small>}{summary.holiday_warning && <small className="daily-alert">{summary.holiday_warning}</small>}</div></div>
      {preferences.show_daily_verse !== false && data.dailyVerse && <blockquote className="daily-experience__verse"><BookHeart /><div><span>VERSÍCULO DO DIA</span><p>“{data.dailyVerse.text}”</p><cite>{data.dailyVerse.reference}</cite></div></blockquote>}
      {summary.can_review && preferences.show_closing_message !== false && <button className="daily-experience__review" onClick={() => setReviewing(true)}><MoonStar /> Revisar o dia</button>}
    </section>
    <Modal isOpen={reviewing} onClose={() => setReviewing(false)} title="Revisar o dia" describedBy="daily-review-message" className="daily-review" overlayClassName="daily-review-overlay">
      <header><div><span>ENCERRAMENTO DO EXPEDIENTE</span></div><button type="button" aria-label="Fechar" onClick={() => setReviewing(false)}><X /></button></header>
      <div className="daily-review__grid"><Stat label="Previstos" value={summary.appointments} /><Stat label="Concluídos" value={summary.completed} /><Stat label="Aguardando conclusão" value={summary.awaiting_completion} /><Stat label="Cancelados" value={summary.cancelled} /><Stat label="Não compareceram" value={summary.no_shows} /><Stat label="Receita recebida" value={money(summary.received)} /><Stat label="Saldo pendente" value={money(summary.pending_balance)} /><Stat label="Pagamentos em análise" value={summary.payments_review} /><Stat label="Agenda de amanhã" value={summary.tomorrow_appointments} /></div>
      {Number(summary.awaiting_completion) > 0 && <div className="daily-review__warning"><strong>Existem atendimentos que ainda precisam ser revisados.</strong><Link to="/admin/agenda">Revisar atendimentos</Link></div>}
      <p id="daily-review-message" className="daily-review__message">{getClosingMessage({ appointments: summary.appointments, completed: summary.completed, pending })}</p>
      {data.closingVerse && <blockquote>“{data.closingVerse.text}” <cite>{data.closingVerse.reference}</cite></blockquote>}
      {error && <p role="alert" className="daily-review__error">{error}</p>}
      <footer><button onClick={() => setReviewing(false)}>Voltar</button>{Number(summary.awaiting_completion) > 0 && <button disabled={saving} onClick={() => confirmReview(true)}>Manter pendente conscientemente</button>}<button className="primary" disabled={saving || Number(summary.awaiting_completion) > 0} onClick={() => confirmReview(false)}><CheckCircle2 /> {saving ? "Salvando..." : "Concluir revisão"}</button></footer>
    </Modal>
  </>;
}
