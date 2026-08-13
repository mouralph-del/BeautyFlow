import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Plus, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import AdminLayout from "../components/admin/AdminLayout";
import SharedModal from "../components/Modal/Modal";
import HolidayManager from "../components/admin/HolidayManager";
import { createAgendaBlock, createManualAppointment, createSpecialSchedule, finalizeAppointment, getAdminAgenda, updateAppointment } from "../services/adminAgenda";
import { getServiceRecords } from "../services/serviceCatalog";
import "./AdminAgenda.css";
import { getMonthCells, saoPauloDateKey, WEEKDAYS_PT_BR } from "../utils/calendar";
import useAccessibleDrawer from "../hooks/useAccessibleDrawer";

const pad = (value) => String(value).padStart(2, "0");
const dbDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const minutes = (time = "00:00") => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const timeFromMinutes = (value) => `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
const mondayOf = (date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
};
const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};
const formatMoney = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel = (item) => {
  if (item.status === "cancelado") return "Cancelado";
  if (item.status === "nao_compareceu") return "Não compareceu";
  if (!["cancelado", "concluido", "nao_compareceu"].includes(item.status) && new Date(`${item.appointment_date}T${item.end_time || item.appointment_time}`) < new Date()) return "Aguardando conclusão";
  if (item.status === "concluido") return "Concluído";
  if (item.status === "confirmado") return "Confirmado";
  if (item.status === "aguardando_aprovacao") return "Encaixe em análise";
  if (item.payment_status === "em_analise") return "Pagamento em análise";
  if (item.payment_status === "aguardando_pagamento") return "Aguardando pagamento";
  return item.status?.replaceAll("_", " ") || "Pendente";
};
const tone = (item) => item.status === "cancelado" ? "cancelled" : item.status === "concluido" ? "completed" : item.status === "confirmado" ? "confirmed" : item.status === "aguardando_aprovacao" ? "request" : "review";

function Modal({ title, onClose, children }) {
  return <SharedModal isOpen onClose={onClose} title={title} className="agenda-modal" overlayClassName="agenda-modal-backdrop">{children}</SharedModal>;
}

function AppointmentDrawer({ appointment, onClose, onAction }) {
  const drawerRef = useAccessibleDrawer(Boolean(appointment), onClose);
  if (!appointment) return null;
  const duration = appointment.total_duration_minutes || appointment.duration_minutes || 0;
  return <><button className="agenda-drawer-overlay" onClick={onClose} aria-label="Fechar detalhes" /><aside ref={drawerRef} className="agenda-drawer" role="dialog" aria-modal="true" aria-labelledby="agenda-drawer-title" tabIndex={-1}><header><div><small>AGENDAMENTO</small><h2 id="agenda-drawer-title">{appointment.customer_name}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></header><div className="agenda-drawer__body">
    <dl><div><dt>Telefone</dt><dd>{appointment.phone}</dd></div><div><dt>E-mail</dt><dd>{appointment.email}</dd></div><div><dt>Serviços</dt><dd>{appointment.services?.map((s) => s.service_name).join(", ") || "Não informado"}</dd></div><div><dt>Valor</dt><dd>{formatMoney(appointment.service_price)}</dd></div><div><dt>Reserva</dt><dd>{formatMoney(appointment.reservation_amount)}</dd></div><div><dt>Pagamento</dt><dd>Reserva via Pix · {appointment.payment_status?.replaceAll("_", " ")}</dd></div><div><dt>Status</dt><dd><span className={`agenda-status agenda-status--${tone(appointment)}`}>{statusLabel(appointment)}</span></dd></div><div><dt>Data e horário</dt><dd>{appointment.appointment_date.split("-").reverse().join("/")} · {appointment.appointment_time.slice(0, 5)}–{appointment.end_time?.slice(0, 5) || timeFromMinutes(minutes(appointment.appointment_time) + duration)}</dd></div><div><dt>Duração</dt><dd>{duration} min</dd></div><div><dt>Observações</dt><dd>{appointment.notes || "Nenhuma observação"}</dd></div></dl>
    <section className="agenda-history"><h3>Histórico</h3><p>Criado em {new Date(appointment.created_at).toLocaleString("pt-BR")}</p><p>Status atual: {statusLabel(appointment)}</p></section>
  </div><footer><button onClick={() => onAction("edit")}>Editar</button><button onClick={() => onAction("reschedule")}>Remarcar</button><button className="danger" onClick={() => onAction("cancel")}>Cancelar</button>{!["concluido","cancelado","nao_compareceu"].includes(appointment.status)&&<><button className="primary" onClick={() => onAction("complete")}>Concluir atendimento</button><button className="danger" onClick={() => onAction("no_show")}>Não compareceu</button><button onClick={onClose}>Manter pendente</button></>}<button onClick={() => onAction("customer")}>Ver cliente</button></footer></aside></>;
}

function OutcomeModal({ appointment, mode, saving, error, onClose, onSubmit }) {
  const balance=Number(appointment.remaining_amount??Math.max(Number(appointment.service_price||0)-Number(appointment.reservation_amount||0),0));
  return <Modal title={mode==="complete"?"Concluir atendimento":"Registrar não comparecimento"} onClose={onClose}><form className="agenda-form" onSubmit={onSubmit}><div className="agenda-outcome-summary"><strong>{appointment.customer_name}</strong><span>{appointment.services?.map(s=>s.service_name).join(" + ")}</span><span>{appointment.appointment_date.split("-").reverse().join("/")} · {appointment.appointment_time.slice(0,5)}</span><span>Total: {formatMoney(appointment.service_price)} · Reserva: {formatMoney(appointment.reservation_amount)} · Saldo: {formatMoney(balance)}</span></div>{mode==="complete"?<><label>Decisão sobre o saldo<select name="balance_action" defaultValue={balance>0?"pending":"paid"}><option value="paid">Pagamento já está completo</option><option value="record">Registrar pagamento agora</option><option value="pending">Manter saldo pendente</option></select></label><div><label>Valor recebido agora<input type="number" min="0" step="0.01" name="payment_amount" defaultValue="0"/></label><label>Forma de pagamento<select name="payment_method"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="debit_card">Débito</option><option value="credit_card">Crédito</option><option value="other">Outro</option></select></label></div><label>Taxa da maquininha<input type="number" min="0" step="0.01" name="machine_fee" defaultValue="0"/></label><label>Observação administrativa<textarea name="notes" rows="3"/></label></>:<><label>Motivo<select name="reason_type"><option>Cliente não compareceu</option><option>Não respondeu ao contato</option><option>Avisou após o horário</option><option>Outro</option></select></label><label>Observação administrativa obrigatória<textarea required minLength="3" name="notes" rows="3"/></label></>}{error&&<p className="agenda-error">{error}</p>}<button disabled={saving}>{saving?"Salvando...":mode==="complete"?"Confirmar conclusão":"Confirmar não comparecimento"}</button></form></Modal>;
}

function AdminAgenda() {
  const [searchParams] = useSearchParams();
  const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("date") || "") ? new Date(`${searchParams.get("date")}T12:00:00`) : null;
  const [referenceDate, setReferenceDate] = useState(requestedDate && !Number.isNaN(requestedDate.getTime()) ? requestedDate : new Date());
  const [view, setView] = useState(searchParams.get("view") === "day" ? "day" : "week");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ appointments: [], blocks: [], specialHours: [], holidays: [] });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(searchParams.get("new") === "1" ? "manual" : null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const weekStart = useMemo(() => mondayOf(referenceDate), [referenceDate]);
  const days = useMemo(() => Array.from({ length: view === "day" ? 1 : 6 }, (_, i) => view === "day" ? referenceDate : addDays(weekStart, i)), [view, referenceDate, weekStart]);
  const range = useMemo(() => view === "month" ? [new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1), new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)] : view === "day" ? [referenceDate, referenceDate] : [weekStart, addDays(weekStart, 5)], [view, referenceDate, weekStart]);
  const rangeStartKey = dbDate(range[0]);
  const rangeEndKey = dbDate(range[1]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getAdminAgenda(`${rangeStartKey}T12:00:00`, `${rangeEndKey}T12:00:00`)); }
    catch (err) { console.error(err); setError("Não foi possível carregar a agenda. Verifique a conexão e as permissões administrativas."); }
    finally { setLoading(false); }
  }, [rangeStartKey, rangeEndKey]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getServiceRecords({ admin: true }).then(setServices).catch(console.error); }, []);

  const filtered = useMemo(() => data.appointments.filter((item) => {
    const matchSearch = `${item.customer_name} ${item.phone} ${item.services?.map((s) => s.service_name).join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || filter === "today" && item.appointment_date === dbDate(new Date()) || filter === "confirmed" && item.status === "confirmado" || filter === "review" && item.payment_status === "em_analise" || filter === "cancelled" && item.status === "cancelado";
    return matchSearch && matchFilter;
  }), [data.appointments, filter, search]);

  const todayKey = saoPauloDateKey();
  const todayItems = data.appointments.filter((item) => item.appointment_date === todayKey && item.status !== "cancelado");
  const metrics = [{label:"Atendimentos",value:todayItems.length},{label:"Concluídos",value:todayItems.filter(item=>item.status==="concluido").length},{label:"Aguardando conclusão",value:todayItems.filter(item=>statusLabel(item)==="Aguardando conclusão").length},{label:"Cancelados",value:data.appointments.filter(item=>item.appointment_date===todayKey&&item.status==="cancelado").length},{label:"Não compareceram",value:todayItems.filter(item=>item.status==="nao_compareceu").length},{label:"Receita recebida",value:formatMoney(todayItems.reduce((sum,item)=>sum+Math.max(0,Number(item.service_price||0)-Number(item.remaining_amount||0)),0))},{label:"Saldo pendente",value:formatMoney(todayItems.reduce((sum,item)=>sum+Number(item.remaining_amount||0),0))}];
  const filters = [["all", "Todos"], ["confirmed", "Confirmados"], ["review", "Pagamento em análise"], ["cancelled", "Cancelados"], ["blocked", "Bloqueados"], ["today", "Hoje"]];

  const move = (amount) => setReferenceDate((current) => addDays(current, amount * (view === "week" ? 7 : view === "day" ? 1 : 30)));
  const submitBlock = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setError(""); try { await createAgendaBlock(Object.fromEntries(form)); setModal(null); await load(); } catch (err) { setError(err.message || "Não foi possível criar o bloqueio."); } finally { setSaving(false); } };
  const submitHours = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.weekday = values.target === "saturday" ? 6 : null; values.special_date = values.target === "date" ? values.special_date : null; delete values.target; setSaving(true); setError(""); try { await createSpecialSchedule(values); setModal(null); await load(); } catch (err) { setError(err.message || "Não foi possível salvar o horário especial."); } finally { setSaving(false); } };
  const submitManual = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const chosen = services.find((item) => String(item.id) === values.service_id); if (!chosen) return; const duration = Number(chosen.duration_minutes); const end = timeFromMinutes(minutes(values.appointment_time) + duration); const appointment = { ...values, end_time: end, status: "confirmado", payment_status: "pago", reservation_paid: true, service_price: chosen.price, reservation_amount: chosen.reservation_amount, remaining_amount: Number(chosen.price) - Number(chosen.reservation_amount), duration_minutes: duration, total_duration_minutes: duration }; delete appointment.service_id; setSaving(true); setError(""); try { await createManualAppointment(appointment, [{ service_id: chosen.legacy_id || chosen.id, service_name: chosen.name, duration_minutes: duration, service_price: chosen.price, reservation_amount: chosen.reservation_amount }]); setModal(null); await load(); } catch (err) { setError(err.message || "Não foi possível criar o agendamento."); } finally { setSaving(false); } };
  const handleAction = async (action) => { if (action === "customer") { window.location.assign(`/admin/clientes?email=${encodeURIComponent(selected.email || selected.phone)}`); return; } if (["edit","reschedule","complete","no_show","cancel-confirm"].includes(action)) { setActionError(""); return setModal(action); } if(action==="cancel") setModal("cancel-confirm"); };
  const submitOutcome=async(event)=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));setSaving(true);setActionError("");try{await finalizeAppointment({appointment_id:selected.id,mode:modal==="complete"?"complete":"no_show",payment_amount:Number(values.payment_amount||0),machine_fee:Number(values.machine_fee||0),payment_method:values.payment_method,keep_balance_pending:values.balance_action==="pending",notes:values.notes,reason:modal==="no_show"?`${values.reason_type}: ${values.notes}`:undefined});setModal(null);setSelected(null);await load()}catch(err){setActionError(err.message)}finally{setSaving(false)}};

  return <AdminLayout><section className="agenda-page"><header className="agenda-page__header"><div><span>AGENDA</span><h1>Agenda</h1><p>Organize atendimentos, bloqueios e horários especiais do estúdio.</p></div><div><button onClick={() => setModal("block")}><Plus size={17} /> Novo bloqueio</button><button onClick={() => setModal("hours")}><Clock3 size={17} /> Horário especial</button><button onClick={() => setReferenceDate(new Date())}>Hoje</button></div></header>
    {error && <p className="agenda-error">{error}</p>}
    <section className="agenda-metrics">{metrics.map((item) => <article key={item.label}><span>{item.label}</span><strong>{loading ? "—" : item.value}</strong></article>)}</section>
    <section className="agenda-toolbar"><div className="agenda-filters">{filters.map(([key, label]) => <button className={filter === key ? "active" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div><label className="agenda-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, telefone ou serviço" /></label></section>
    <section className="agenda-board"><header><div className="agenda-nav"><button onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft /></button><strong>{range[0].toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button onClick={() => move(1)} aria-label="Próximo"><ChevronRight /></button></div><div className="agenda-view-tabs">{[["day","Dia"],["week","Semana"],["month","Mês"]].map(([key,label]) => <button className={view === key ? "active" : ""} onClick={() => setView(key)} key={key}>{label}</button>)}</div></header>
      {view === "month" ? <MonthView date={referenceDate} appointments={filtered} blocks={data.blocks} holidays={data.holidays} onSelect={(date) => { setReferenceDate(date); setView("day"); }} /> : <TimeGrid days={days} appointments={filtered} blocks={filter === "blocked" || filter === "all" ? data.blocks : []} onSelect={setSelected} />}
    </section>
    <button className="agenda-floating" onClick={() => setModal("manual")}><Plus /> Novo agendamento</button>
  </section>
  <HolidayManager onChanged={load} />
  <AppointmentDrawer appointment={selected} onClose={() => setSelected(null)} onAction={handleAction} />
  {(modal==="complete"||modal==="no_show")&&selected&&<OutcomeModal appointment={selected} mode={modal} saving={saving} error={actionError} onClose={()=>setModal(null)} onSubmit={submitOutcome}/>} 
  {modal==="cancel-confirm"&&selected&&<Modal title="Cancelar atendimento" onClose={()=>setModal(null)}><div className="agenda-form"><p>Confirme o cancelamento deste atendimento. As regras atuais de cancelamento serão preservadas.</p>{actionError&&<p className="agenda-error">{actionError}</p>}<div><button type="button" className="secondary" onClick={()=>setModal(null)}>Voltar</button><button type="button" className="danger" disabled={saving} onClick={async()=>{setSaving(true);setActionError("");try{await updateAppointment(selected.id,{status:"cancelado",cancelled_at:new Date().toISOString(),cancelled_by:"admin"});setModal(null);setSelected(null);await load()}catch(err){setActionError(err.message)}finally{setSaving(false)}}}>Confirmar cancelamento</button></div></div></Modal>}
  {modal === "block" && <Modal title="Novo bloqueio" onClose={() => setModal(null)}><form className="agenda-form" onSubmit={submitBlock}><label>Data<input required type="date" name="block_date" /></label><div><label>Início<input required type="time" name="start_time" /></label><label>Fim<input required type="time" name="end_time" /></label></div><label>Motivo<select name="reason_type"><option value="compromisso">Compromisso</option><option value="curso">Curso</option><option value="ferias">Férias</option><option value="manutencao">Manutenção</option><option value="outro">Outro</option></select></label><label>Observação<textarea name="reason" rows="3" /></label><button disabled={saving}>{saving ? "Salvando..." : "Salvar bloqueio"}</button></form></Modal>}
  {modal === "hours" && <Modal title="Horário especial" onClose={() => setModal(null)}><form className="agenda-form" onSubmit={submitHours}><label>Aplicar em<select name="target"><option value="date">Data específica</option><option value="saturday">Todos os sábados</option></select></label><label>Data<input type="date" name="special_date" /></label><div><label>Abertura<input required type="time" name="opening_time" defaultValue="08:00" /></label><label>Fechamento<input required type="time" name="closing_time" defaultValue="18:00" /></label></div><div><label>Início da pausa<input type="time" name="break_start" defaultValue="12:00" /></label><label>Fim da pausa<input type="time" name="break_end" defaultValue="13:30" /></label></div><label>Observação<input name="notes" /></label><button disabled={saving}>Salvar horário</button></form></Modal>}
  {modal === "manual" && <Modal title="Novo agendamento" onClose={() => setModal(null)}><form className="agenda-form" onSubmit={submitManual}><label>Cliente<input required name="customer_name" /></label><div><label>Telefone<input required name="phone" /></label><label>E-mail<input required type="email" name="email" /></label></div><label>Serviço<select required name="service_id"><option value="">Selecione</option>{services.filter((s) => s.is_active).map((s) => <option value={s.id} key={s.id}>{s.name} · {s.duration_minutes} min</option>)}</select></label><div><label>Data<input required type="date" name="appointment_date" /></label><label>Horário<input required type="time" name="appointment_time" /></label></div><label>Observações<textarea name="notes" rows="3" /></label><button disabled={saving}>Criar agendamento</button></form></Modal>}
  {(modal === "edit" || modal === "reschedule") && <Modal title={modal === "edit" ? "Editar atendimento" : "Remarcar atendimento"} onClose={() => setModal(null)}><form className="agenda-form" onSubmit={async (e) => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); if (values.appointment_time) values.end_time = timeFromMinutes(minutes(values.appointment_time) + (selected.total_duration_minutes || selected.duration_minutes)); setSaving(true); setError(""); try { await updateAppointment(selected.id, values); setModal(null); setSelected(null); await load(); } catch (err) { setError(err.message || "Não foi possível atualizar o atendimento."); } finally { setSaving(false); } }}><label>Cliente<input name="customer_name" defaultValue={selected?.customer_name} /></label><div><label>Data<input type="date" name="appointment_date" defaultValue={selected?.appointment_date} /></label><label>Horário<input type="time" name="appointment_time" defaultValue={selected?.appointment_time?.slice(0,5)} /></label></div><label>Observações<textarea name="notes" defaultValue={selected?.notes} /></label><button disabled={saving}>Salvar alterações</button></form></Modal>}
  </AdminLayout>;
}

function TimeGrid({ days, appointments, blocks, onSelect }) {
  const start = 8 * 60; const end = 18 * 60; const px = 1;
  return <div className="agenda-time-grid" style={{ "--columns": days.length, "--grid-height": `${(end-start)*px}px` }}><div className="agenda-time-axis">{Array.from({ length: 11 }, (_, i) => <span style={{ top: i*60*px }} key={i}>{pad(8+i)}:00</span>)}</div><div className="agenda-days">{days.map((day) => { const key = dbDate(day); return <div className="agenda-day" key={key}><header><b>{day.toLocaleDateString("pt-BR", { weekday: "short" })}</b><span>{pad(day.getDate())}</span></header><div className="agenda-day__body">{appointments.filter((a) => a.appointment_date === key).map((a) => { const top = (minutes(a.appointment_time)-start)*px; const height = Math.max(38, (a.total_duration_minutes || a.duration_minutes || 30)*px); return <button key={a.id} className={`agenda-event agenda-event--${tone(a)}`} style={{ top, height }} onClick={() => onSelect(a)}><strong>{a.appointment_time.slice(0,5)} {a.customer_name}</strong><span>{a.services?.map((s) => s.service_name).join(" + ") || "Atendimento"}</span></button>; })}{blocks.filter((b) => b.block_date === key).map((b) => <div key={b.id} className="agenda-event agenda-event--blocked" style={{ top: (minutes(b.start_time)-start)*px, height: Math.max(38,(minutes(b.end_time)-minutes(b.start_time))*px) }}><strong>{b.start_time.slice(0,5)} Bloqueado</strong><span>{b.reason || b.reason_type}</span></div>)}</div></div>; })}</div></div>;
}

function MonthView({ date, appointments, blocks, holidays, onSelect }) {
  const cells = getMonthCells(date.getFullYear(),date.getMonth());
  return <div className="agenda-month">{WEEKDAYS_PT_BR.map((d)=><b key={d} title={d}>{d.slice(0,3)}</b>)}{cells.map((day,i) => day ? <button key={dbDate(day)} onClick={() => onSelect(day)}><strong>{day.getDate()}</strong><span>{appointments.filter(a=>a.appointment_date===dbDate(day)).length} atend.</span>{blocks.some(b=>b.block_date===dbDate(day)) && <small>Bloqueio</small>}{holidays?.find(h=>h.holiday_date===dbDate(day))&&<small title={holidays.find(h=>h.holiday_date===dbDate(day)).name}>Feriado · {holidays.find(h=>h.holiday_date===dbDate(day)).admin_decision.replaceAll("_"," ")}</small>}</button> : <i key={`empty-${i}`} />)}</div>;
}

export default AdminAgenda;
