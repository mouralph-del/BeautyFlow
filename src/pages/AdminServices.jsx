import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import Modal from "../components/Modal/Modal";
import { formatErrorMessage } from "../components/Error/errorMapper";
import { deleteService, getServiceRecords, saveService, setServiceActive } from "../services/serviceCatalog";
import "./AdminCatalog.css";

const empty = { name: "", slug: "", category: "", short_description: "", full_description: "", duration_label: "", duration_minutes: 30, price: 0, reservation_amount: 0, is_active: true, is_featured: false, display_order: 0, card_title: "", subtitle: "", important_information: "", payment_notice: "Aceitamos Pix, cartão de débito e cartão de crédito.", credit_card_fee_notice: "Pagamentos realizados no cartão de crédito estarão sujeitos à taxa da maquininha.", image_url: "" };

function ServiceForm({ form, setForm, onClose, onSubmit, title, submitting }) {
  const change = (event) => { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value })); };
  return <Modal isOpen onClose={onClose} title={title} className="admin-form-modal" overlayClassName="admin-form-overlay">
    <form onSubmit={onSubmit}>
      <header className="admin-form-modal__head"><button type="button" onClick={onClose} aria-label="Fechar">×</button></header>
      <div className="admin-form-grid">
        {[["name", "Nome*"], ["slug", "Slug*"], ["category", "Categoria*"], ["duration_label", "Duração exibida*"], ["duration_minutes", "Duração em minutos*", "number"], ["price", "Preço*", "number"], ["reservation_amount", "Taxa de reserva*", "number"], ["display_order", "Ordem*", "number"], ["card_title", "Título do card"], ["subtitle", "Subtítulo"], ["image_url", "Imagem opcional"]].map(([name, label, type = "text"]) => <label key={name}>{label}<input name={name} type={type} min={name === "duration_minutes" ? 1 : type === "number" ? 0 : undefined} step={name.includes("price") || name.includes("amount") ? "0.01" : undefined} required={["name", "slug", "category", "duration_label", "duration_minutes", "price", "reservation_amount", "display_order"].includes(name)} value={form[name] ?? ""} onChange={change} /></label>)}
        {[["short_description", "Descrição curta*"], ["full_description", "Descrição completa*"], ["important_information", "Informações importantes"], ["payment_notice", "Aviso sobre Pix, débito e crédito"], ["credit_card_fee_notice", "Taxa da maquininha no crédito"]].map(([name, label]) => <label className="wide" key={name}>{label}<textarea name={name} required={name.includes("description")} value={form[name] ?? ""} onChange={change} /></label>)}
        <div className="admin-checks wide"><label><input name="is_active" type="checkbox" checked={form.is_active} onChange={change} /> Ativo</label><label><input name="is_featured" type="checkbox" checked={form.is_featured} onChange={change} /> Destaque</label></div>
      </div>
      <div className="admin-form-actions"><button type="button" className="admin-action" disabled={submitting} onClick={onClose}>Cancelar</button><button className="admin-primary" disabled={submitting}>{submitting ? "Salvando..." : "Salvar serviço"}</button></div>
    </form>
  </Modal>;
}

export default function AdminServices() {
  const [items, setItems] = useState([]); const [editing, setEditing] = useState(null); const [modal, setModal] = useState(false); const [deleting, setDeleting] = useState(null); const [form, setForm] = useState(empty); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false);
  const load = () => { setLoading(true); return getServiceRecords({ admin: true }).then(setItems).catch(() => { console.error("Não foi possível carregar os serviços."); setMessage("Não foi possível carregar os serviços."); }).finally(() => setLoading(false)); };
  useEffect(() => { void load(); }, []);
  const open = (item) => { setEditing(item || null); setForm(item ? { ...empty, ...item } : empty); setModal(true); };
  const submit = async (event) => { event.preventDefault(); if (submitting) return; if (!form.name.trim() || !form.category.trim() || Number(form.duration_minutes) <= 0 || Number(form.price) < 0 || Number(form.reservation_amount) < 0) { setMessage("Preencha os campos obrigatórios com valores válidos."); return; } setSubmitting(true); try { await saveService(form, editing?.id); setModal(false); setEditing(null); setMessage("Serviço salvo com sucesso."); await load(); } catch (error) { console.error("Não foi possível salvar o serviço."); setMessage(formatErrorMessage(error) || "Não foi possível salvar o serviço."); } finally { setSubmitting(false); } };
  const toggle = async (item) => { try { await setServiceActive(item.id, !item.is_active); await load(); } catch (error) { setMessage(formatErrorMessage(error) || "Não foi possível atualizar o estado do serviço."); } };
  const remove = async () => { const item = deleting; if (!item) return; setSubmitting(true); try { const result = await deleteService(item); setMessage(result === "paused" ? "O serviço possui histórico e foi pausado." : "Serviço excluído com sucesso."); setDeleting(null); await load(); } catch (error) { console.error(error); setMessage(formatErrorMessage(error) || "Não foi possível remover o serviço."); } finally { setSubmitting(false); } };
  const activeCount = items.filter((item) => item.is_active).length;
  return <AdminLayout><section className="admin-catalog">
    <header className="admin-catalog__header"><div><span>CATÁLOGO</span><h1>Gestão de Serviços</h1><p>Cadastre, atualize e organize os procedimentos disponíveis no Beauty Studio.</p></div><button className="admin-primary" onClick={() => open(null)}>Novo serviço</button></header>
    <div className="admin-catalog__metrics"><article><span>Total</span><strong>{items.length}</strong></article><article><span>Ativos</span><strong>{activeCount}</strong></article><article><span>Pausados</span><strong>{items.length - activeCount}</strong></article></div>
    {message && <div className={`admin-message ${message.includes("sucesso") || message.includes("pausado") ? "" : "error"}`}><span>{message}</span>{message.startsWith("Não foi possível carregar") && <button type="button" onClick={load}>Tentar novamente</button>}</div>}
    {loading ? <p className="admin-loading">Carregando serviços...</p> : items.length === 0 ? <p className="admin-empty-state">Nenhum serviço cadastrado.</p> : <div className="admin-catalog__grid">{items.map((item) => <article className="admin-service-row" key={item.id}><div><h2>{item.name}</h2><p>{item.category}</p><small>{item.short_description}</small></div><div><small>Duração</small><strong>{item.duration_label}</strong></div><div><small>Preço</small><strong>R$ {Number(item.price).toFixed(2)}</strong></div><div><small>Reserva</small><strong>R$ {Number(item.reservation_amount).toFixed(2)}</strong></div><div><span className={`admin-status ${item.is_active ? "" : "paused"}`}>{item.is_active ? "Ativo" : "Pausado"}</span><small>Ordem {item.display_order}{item.is_featured ? " · Destaque" : ""}</small><small>Atualizado em {new Date(item.updated_at).toLocaleDateString("pt-BR")}</small></div><div className="admin-row-actions"><button className="admin-action" onClick={() => open(item)}>Editar</button><button className="admin-action" onClick={() => toggle(item)}>{item.is_active ? "Pausar" : "Ativar"}</button><Link className="admin-action" to={`/servicos/${item.slug}`} target="_blank">Visualizar</Link><button className="admin-action danger" onClick={() => setDeleting(item)}>Excluir</button></div></article>)}</div>}
    {modal && <ServiceForm form={form} setForm={setForm} onClose={() => setModal(false)} onSubmit={submit} submitting={submitting} title={editing ? "Editar serviço" : "Novo serviço"} />}
    <Modal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Excluir serviço" describedBy="delete-service-description" className="admin-confirm-modal"><p id="delete-service-description">Excluir {deleting?.name}? Se houver histórico, ele será apenas pausado.</p><div className="admin-form-actions"><button type="button" disabled={submitting} onClick={() => setDeleting(null)}>Voltar</button><button type="button" className="danger" disabled={submitting} onClick={remove}>{submitting ? "Excluindo..." : "Confirmar exclusão"}</button></div></Modal>
  </section></AdminLayout>;
}
