import { useCallback, useEffect, useRef, useState } from "react";
import { formatErrorMessage } from "../components/Error/errorMapper";
import { CalendarClock, CreditCard, RefreshCw, Search, UserRoundX, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import AdminLayout from "../components/admin/AdminLayout";
import Modal from "../components/Modal/Modal";
import { getAdminPaymentRequest, getAdminRequests, getPaymentProofUrl, reviewFit, reviewPayment, reviewReschedule } from "../services/adminRequests";
import "./AdminRequests.css";

const tabs = [
  { key: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { key: "encaixes", label: "Encaixes", icon: CalendarClock },
  { key: "remarcacoes", label: "Remarcações", icon: RefreshCw },
  { key: "cancelamentos", label: "Cancelamentos", icon: UserRoundX },
];
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const dateTime = (value) => value ? new Date(value).toLocaleString("pt-BR") : "—";
const services = (item) => item.services?.map((service) => service.service_name).join(" + ") || item.service_name || item.appointment?.services?.map((service) => service.service_name).join(" + ") || item.appointment?.service_name || "Serviço não informado";
const statusText = (status = "") => ({ em_analise: "Pagamento em análise", pendente: "Pendente", aguardando_aprovacao: "Aguardando aprovação", aguardando_resposta_cliente: "Aguardando resposta da cliente", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado" }[status] || status.replaceAll("_", " "));
const priority = (item, tab) => {
  if (["aprovado", "recusado", "cancelado", "concluido"].includes(item.status)) return "low";
  const created = new Date(item.created_at); const age = Date.now() - created.getTime();
  const target = new Date(`${item.appointment_date || item.requested_date || item.appointment?.appointment_date}T12:00:00`);
  if (age > 24 * 3600000 || (tab !== "pagamentos" && target - Date.now() < 48 * 3600000)) return "high";
  return "medium";
};
const emptyMessages = { pagamentos: "Nenhum pagamento aguardando análise.", encaixes: "Nenhuma solicitação de encaixe.", remarcacoes: "Nenhuma remarcação pendente.", cancelamentos: "Nenhum cancelamento recente." };

function RequestDrawer({ item, tab, history, onClose, onAction, onProof, proofUrl, modalOpen }) {
  const drawerRef = useRef(null);
  const previouslyFocused = useRef(null);
  useEffect(() => {
    if (!item || modalOpen) return undefined;
    previouslyFocused.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    const getFocusableItems = () => drawer?.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    const focusableItems = getFocusableItems();
    if (focusableItems?.length) focusableItems[0].focus();
    else drawer?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(getFocusableItems() || []);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [item, modalOpen, onClose]);

  if (!item) return null;
  const appointment = item.appointment || item;
  const itemHistory = history.filter((entry) => entry.request_id === String(item.id));
  return <><div className="requests-drawer-overlay" onClick={onClose} aria-hidden="true" /><aside ref={drawerRef} className="requests-drawer" role="dialog" aria-modal="true" aria-labelledby="requests-drawer-title" aria-describedby="requests-drawer-desc" tabIndex={-1}><header><div><small>{tabs.find((entry) => entry.key === tab)?.label}</small><h2 id="requests-drawer-title">{item.customer_name || appointment.customer_name}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X /></button></header><div id="requests-drawer-desc" className="requests-drawer__content"><dl>
    <Info label="Telefone" value={item.phone || appointment.phone} /><Info label="E-mail" value={item.email || appointment.email} /><Info label="Serviços" value={services(item)} />
    <Info label="Data" value={date(item.appointment_date || item.requested_date || appointment.appointment_date)} /><Info label="Horário inicial" value={(item.appointment_time || item.requested_time || appointment.appointment_time)?.slice(0,5)} /><Info label="Horário final" value={(item.end_time || appointment.end_time)?.slice(0,5)} />
    <Info label="Duração total" value={`${item.total_duration_minutes || appointment.total_duration_minutes || item.duration_minutes || appointment.duration_minutes || 0} min`} /><Info label="Valor total" value={money(item.total_price || appointment.service_price)} /><Info label="Taxa de reserva" value={money(item.reservation_amount || appointment.reservation_amount)} /><Info label="Valor restante" value={money(item.remaining_amount || appointment.remaining_amount)} />
    <Info label="Enviado em" value={dateTime(item.created_at)} /><Info label="Status" value={statusText(item.payment_status || item.status)} /><Info label="Autorização de imagem" value={appointment.image_authorization == null ? "Não informado" : appointment.image_authorization ? "Autorizada" : "Não autorizada"} /><Info label="Política de reserva" value={appointment.reservation_policy_accepted ? "Aceita" : "Não registrada"} /><Info label="Observações" value={item.notes || appointment.notes || item.reason || "Nenhuma"} />
  </dl>
  {tab === "pagamentos" && <section className="requests-proof" aria-labelledby="requests-proof-title"><h3 id="requests-proof-title">Comprovante</h3>{proofUrl ? <a href={proofUrl} target="_blank" rel="noreferrer"><img src={proofUrl} alt="Comprovante de pagamento" /></a> : <button type="button" onClick={onProof}>Visualizar comprovante com segurança</button>}</section>}
  {tab === "cancelamentos" && <section className="requests-cancellation" aria-labelledby="requests-cancellation-title"><h3 id="requests-cancellation-title">Cancelamento</h3><p><strong>Cancelado em:</strong> {dateTime(appointment.cancelled_at)}</p><p><strong>Cancelado por:</strong> {appointment.cancelled_by || "Não informado"}</p><p><strong>Menos de 24 horas:</strong> {appointment.late_cancellation ? "Sim" : "Não"}</p><p><strong>Taxa:</strong> não reembolsável conforme política aceita.</p><p><strong>Horário:</strong> liberado automaticamente.</p></section>}
  <section className="requests-history" aria-labelledby="requests-history-title"><h3 id="requests-history-title">Histórico</h3><p>Solicitação recebida em {dateTime(item.created_at)}</p>{itemHistory.map((entry) => <p key={entry.id}>{dateTime(entry.created_at)} · {entry.description || entry.action}</p>)}</section></div>
  <footer>{tab === "pagamentos" && <><button type="button" className="primary" onClick={() => onAction("approve")}>Confirmar pagamento</button><button type="button" className="danger" onClick={() => onAction("reject")}>Recusar pagamento</button></>}{tab === "encaixes" && <><button type="button" className="primary" onClick={() => onAction("approve")}>Aprovar encaixe</button><button type="button" onClick={() => onAction("suggest")}>Sugerir outro horário</button><button type="button" className="danger" onClick={() => onAction("reject")}>Recusar</button></>}{tab === "remarcacoes" && <><button type="button" className="primary" onClick={() => onAction("approve")}>Aprovar remarcação</button><button type="button" onClick={() => onAction("suggest")}>Sugerir outro horário</button><button type="button" className="danger" onClick={() => onAction("reject")}>Recusar</button></>}<a href={`https://wa.me/55${String(item.phone || appointment.phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Entrar em contato</a><Link to="/admin/agenda">Ver agendamento</Link><Link to={`/admin/clientes?email=${encodeURIComponent(item.email || appointment.email || item.phone || appointment.phone || "")}`}>Ver cliente</Link></footer></aside></>;
}
function Info({ label, value }) { return <div><dt>{label}</dt><dd>{value || "—"}</dd></div>; }

function AdminRequests() {
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get("tab") || "pagamentos");
  const [data, setData] = useState({ payments: [], fits: [], reschedules: [], cancellations: [], history: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null); const [modal, setModal] = useState(null); const [proofUrl, setProofUrl] = useState(""); const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState(""); const [period, setPeriod] = useState("90"); const [status, setStatus] = useState("all"); const [priorityFilter, setPriorityFilter] = useState("all"); const [serviceFilter, setServiceFilter] = useState("all"); const [administratorFilter, setAdministratorFilter] = useState("all");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const from = period === "all" ? null : new Date(Date.now() - Number(period) * 86400000).toISOString().slice(0,10); setData(await getAdminRequests({ from })); } catch { console.error("Não foi possível carregar as solicitações."); setError("Não foi possível carregar as solicitações. Tente novamente."); } finally { setLoading(false); } }, [period]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const requestId = params.get("request");
    if (!requestId) return;
    const requestedTab = tabs.some((entry) => entry.key === params.get("tab")) ? params.get("tab") : "pagamentos";
    setActiveTab(requestedTab);
    if (requestedTab !== "pagamentos") {
      if (loading) return;
      const collection = requestedTab === "encaixes" ? data.fits : requestedTab === "remarcacoes" ? data.reschedules : data.cancellations;
      const item = collection.find((entry) => String(entry.id) === requestId || String(entry.appointment_id) === requestId);
      if (!item) setMessage("Esta solicitação não foi encontrada ou já foi resolvida."); else { setSelected(item); setProofUrl(""); }
      return;
    }
    let active = true;
    getAdminPaymentRequest(requestId).then((item) => {
      if (!active) return;
      if (!item) setMessage("Esta solicitação não foi encontrada ou não está mais disponível.");
      else if (item.payment_status !== "em_analise") setMessage("Esta solicitação de pagamento já foi resolvida.");
      else { setSelected(item); setProofUrl(""); }
    }).catch(() => active && setMessage("Não foi possível localizar esta solicitação."));
    return () => { active = false; };
  }, [params, data, loading]);
  const counts = { pagamentos: data.payments.length, encaixes: data.fits.filter((i) => ["pendente","pending_review","proposta_recusada"].includes(i.status)).length, remarcacoes: data.reschedules.filter((i) => ["pendente","proposta_recusada"].includes(i.status)).length, cancelamentos: data.cancellations.length };
  const currentItems = activeTab === "pagamentos" ? data.payments : activeTab === "encaixes" ? data.fits : activeTab === "remarcacoes" ? data.reschedules : data.cancellations;
  const serviceOptions = [...new Set(currentItems.map(services))].sort();
  const list = currentItems.filter((item) => { const appointment = item.appointment || item; const itemServices = services(item); const haystack = `${item.customer_name || appointment.customer_name} ${item.phone || appointment.phone} ${item.email || appointment.email} ${itemServices}`.toLowerCase(); const itemStatus = item.payment_status || item.status; const reviewedBy = item.reviewed_by || item.payment_reviewed_by; return haystack.includes(search.toLowerCase()) && (status === "all" || itemStatus === status) && (priorityFilter === "all" || priority(item, activeTab) === priorityFilter) && (serviceFilter === "all" || itemServices === serviceFilter) && (administratorFilter === "all" || (administratorFilter === "reviewed" ? reviewedBy : !reviewedBy)); });
  const changeTab = (key) => { setActiveTab(key); setParams({ tab: key }); setSelected(null); setProofUrl(""); };
  const closeDrawer = () => { setSelected(null); setProofUrl(""); const next = new URLSearchParams(params); next.delete("request"); next.set("tab", activeTab); setParams(next, { replace: true }); };
  const openProof = async () => { try { setProofUrl(await getPaymentProofUrl(selected.payment_proof)); } catch (proofError) { setError(formatErrorMessage(proofError)); } };
  const runAction = async (event) => { event.preventDefault(); if (submitting) return; const values = Object.fromEntries(new FormData(event.currentTarget)); setSubmitting(true); setError(""); try { if (activeTab === "pagamentos") { await reviewPayment({ id: selected.id, approved: modal === "approve", reason: values.reason, notes: values.notes }); setMessage(modal === "approve" ? "Pagamento confirmado com sucesso." : "Pagamento recusado e horário liberado."); } else if (activeTab === "encaixes") { await reviewFit({ id: selected.id, action: modal === "approve" ? "aprovar" : modal === "suggest" ? "sugerir" : "recusar", date: values.date, time: values.time, message: values.message, reason: values.reason }); setMessage("Solicitação de encaixe atualizada com sucesso."); } else { await reviewReschedule({ id: selected.id, action: modal === "approve" ? "aprovar" : modal === "suggest" ? "sugerir" : "recusar", date: values.date, time: values.time, message: values.message }); setMessage("Pedido de remarcação atualizado com sucesso."); } setModal(null); setSelected(null); setProofUrl(""); await load(); } catch (actionError) { console.error("Não foi possível analisar a solicitação."); setError(formatErrorMessage(actionError) || "Não foi possível concluir a ação."); } finally { setSubmitting(false); } };
  return <AdminLayout notifications={counts.pagamentos + counts.encaixes + counts.remarcacoes}><section className="admin-requests"><header className="admin-requests__header"><div><span>CENTRAL ADMINISTRATIVA</span><h1>Solicitações</h1><p>Analise pagamentos, encaixes e remarcações, além de acompanhar os cancelamentos recebidos.</p></div><div className="admin-requests__tools"><button onClick={load}><RefreshCw size={16} /> Atualizar</button><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar" /></label><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option><option value="all">Todo o período</option></select></div></header>
  {error && <div className="requests-feedback error">{error}<button onClick={load}>Tentar novamente</button></div>}{message && <p className="requests-feedback success">{message}</p>}
  <section className="requests-summary">{tabs.map(({key,label,icon:Icon}) => <button key={key} onClick={() => changeTab(key)} className={activeTab === key ? "active" : ""}><Icon /><span>{label}</span><strong>{counts[key]}</strong><small>{key === "cancelamentos" ? "Acompanhamento recente" : "Itens que exigem atenção"}</small></button>)}</section>
  <nav className="requests-tabs">{tabs.map(({key,label}) => <button key={key} className={activeTab === key ? "active" : ""} onClick={() => changeTab(key)}>{label} ({counts[key]})</button>)}</nav>
  <section className="requests-filters"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos os status</option><option value="pendente">Pendente</option><option value="aguardando_aprovacao">Aguardando aprovação</option><option value="aguardando_resposta_cliente">Aguardando resposta</option><option value="cancelado">Cancelado</option></select><select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}><option value="all">Todos os serviços</option>{serviceOptions.map((name) => <option key={name}>{name}</option>)}</select><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="all">Todas as prioridades</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select><select value={administratorFilter} onChange={(e) => setAdministratorFilter(e.target.value)}><option value="all">Todas as responsáveis</option><option value="reviewed">Analisadas pela administração</option><option value="pending">Sem responsável</option></select></section>
  {loading ? <div className="requests-loading">Carregando solicitações...</div> : list.length === 0 ? <div className="requests-empty">{emptyMessages[activeTab]}</div> : <div className="requests-list">{list.map((item) => <article className="request-card" key={item.id}><span className={`request-priority ${priority(item, activeTab)}`}>Prioridade {priority(item, activeTab) === "high" ? "alta" : priority(item, activeTab) === "medium" ? "média" : "baixa"}</span><div><h2>{item.customer_name || item.appointment?.customer_name}</h2><p>{services(item)}</p><small>{item.phone || item.appointment?.phone} · {item.email || item.appointment?.email}</small></div><dl><Info label="Data" value={date(item.appointment_date || item.requested_date || item.appointment?.appointment_date)} /><Info label="Horário" value={(item.appointment_time || item.requested_time || item.appointment?.appointment_time)?.slice(0,5)} /><Info label="Solicitado em" value={dateTime(item.created_at)} /><Info label="Status" value={statusText(item.payment_status || item.status)} /></dl><button onClick={() => { setSelected(item); setProofUrl(""); }}>Ver detalhes</button></article>)}</div>}
  </section><RequestDrawer item={selected} tab={activeTab} history={data.history} proofUrl={proofUrl} onProof={openProof} onClose={closeDrawer} onAction={setModal} modalOpen={Boolean(modal)} />
  {modal && (
    <Modal
      isOpen={true}
      onClose={() => setModal(null)}
      title={modal === "approve" ? "Confirmar solicitação" : modal === "suggest" ? "Sugerir outro horário" : "Recusar solicitação"}
      labelledBy="requests-action-modal-title"
      describedBy="requests-action-modal-description"
      className="requests-modal"
      overlayClassName="requests-modal-backdrop"
      closeOnOverlayClick={true}
    >
      <form className="requests-action-form" onSubmit={runAction} id="requests-action-modal-description">
        {modal === "approve" && <p>Confirme a ação para <strong>{selected?.customer_name || selected?.appointment?.customer_name}</strong>, serviço <strong>{services(selected || {})}</strong>{activeTab === "pagamentos" && <> e valor de <strong>{money(selected?.reservation_amount)}</strong></>}.</p>}
        {modal === "reject" && <><label>Motivo<select required name="reason"><option value="">Selecione</option><option>Pagamento não localizado</option><option>Valor incorreto</option><option>Comprovante ilegível</option><option>Comprovante inválido</option><option>Outro</option></select></label><label>Observação complementar<textarea name="notes" rows="3" /></label></>}
        {(modal === "suggest" || (modal === "approve" && activeTab !== "pagamentos")) && <div><label>Data<input required type="date" name="date" defaultValue={selected?.requested_date || selected?.appointment_date} /></label><label>Horário<input required type="time" name="time" defaultValue={(selected?.requested_time || selected?.appointment_time)?.slice(0,5)} /></label></div>}
        {activeTab !== "pagamentos" && <label>Mensagem<textarea name="message" rows="3" /></label>}
        <footer><button type="button" onClick={() => setModal(null)}>Voltar</button><button className={modal === "reject" ? "danger" : "primary"} disabled={submitting}>{submitting ? "Salvando..." : "Confirmar ação"}</button></footer>
      </form>
    </Modal>
  )}
  </AdminLayout>;
}
export default AdminRequests;
