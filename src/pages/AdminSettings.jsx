import { useEffect, useMemo, useState } from "react";
import { Bell, Building2, CalendarClock, CreditCard, Eye, EyeOff, Globe2, LockKeyhole, Mail, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { Link } from "react-router-dom";

import AdminLayout from "../components/admin/AdminLayout";
import Modal from "../components/Modal/Modal";
import PasswordInput from "../components/PasswordInput/PasswordInput";
import { useAuth } from "../contexts/useAuth";
import { getAdminSettings, saveAdminDailyPreference, saveAdminPreference, saveEmailTemplate, saveNotifications, savePolicy, saveSettings, setAdminRole, signOutAllSessions, updateAccountEmail, updatePassword } from "../services/settings";
import "./AdminSettings.css";

const tabs = [
  ["profile", "Perfil do estúdio", Building2], ["schedule", "Agenda e horários", CalendarClock],
  ["payments", "Pagamentos e Pix", CreditCard], ["policies", "Políticas", ShieldCheck],
  ["communication", "Comunicação e e-mails", Mail], ["site", "Site", Globe2],
  ["admins", "Administradores", UserCog], ["security", "Segurança", LockKeyhole],
];
const days = [["1","Segunda"],["2","Terça"],["3","Quarta"],["4","Quinta"],["5","Sexta"],["6","Sábado"],["0","Domingo"]];
const policyInfo = {
  reservation: ["Política de reserva", "Explica a finalidade da taxa e as condições aceitas ao reservar."],
  cancellation: ["Política de cancelamento", "Informa prazos, liberação do horário e tratamento da taxa."],
  image_authorization: ["Autorização de uso de imagem", "Registra a escolha da cliente sobre fotos e vídeos do resultado."],
  address_notice: ["Aviso sobre endereço", "Explica quando o endereço completo do atendimento será enviado."],
};
const notificationLabels = { new_appointment:"Novo agendamento",payment_proof:"Comprovante enviado",payment_refused:"Pagamento recusado",cancellation:"Cancelamento",booking_request:"Encaixe",reschedule:"Remarcação",schedule_release:"Agenda do próximo mês",promotion_ending:"Promoção encerrando",new_customer:"Nova cliente" };

export default function AdminSettings() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const result = await getAdminSettings();
      setData(result);
      setForm({
        profile: { ...result.studio.public_data }, payments: { ...result.studio.private_data },
        site: { ...result.studio.public_data.site }, schedule: result.schedule.settings,
        policies: Object.fromEntries(result.policies.filter((p) => p.is_active).map((p) => [p.policy_type, p.content])),
        notifications: result.notifications, templates: result.templates,
      });
      setSelectedTemplate(result.templates[0] || null); setDirty(false);
    } catch (loadError) { console.error(loadError); setError("Não foi possível carregar as configurações."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = (section, key, value) => { setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } })); setDirty(true); };
  const save = async (section) => {
    setSaving(true); setMessage("");
    try {
      if (section === "policies") {
        for (const [type, content] of Object.entries(form.policies)) {
          const old = data.policies.find((p) => p.policy_type === type && p.is_active)?.content;
          if (content !== old) await savePolicy(type, content);
        }
      } else if (section === "notifications") await saveNotifications(form.notifications);
      else if (section === "communication" && selectedTemplate) await saveEmailTemplate(selectedTemplate);
      else await saveSettings(section, form[section]);
      setMessage("Configurações salvas com sucesso."); await load();
    } catch (saveError) { console.error(saveError); setMessage("Não foi possível salvar as configurações."); }
    finally { setSaving(false); }
  };

  if (loading) return <AdminLayout><div className="settings-state">Carregando configurações...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="settings-state error">{error}<button onClick={load}>Tentar novamente</button></div></AdminLayout>;

  return <AdminLayout><section className="admin-settings">
    <header><div><span>PERSONALIZAÇÃO</span><h1>Configurações</h1><p>Personalize as informações do estúdio e o funcionamento do Beauty Studio.</p></div><div>{dirty && <strong>Alterações não salvas</strong>}<button onClick={load}><RefreshCw size={16}/> Atualizar</button></div></header>
    {message && <p className="settings-message" role="status">{message}</p>}
    <div className="settings-layout"><nav>{tabs.map(([id,label,Icon]) => <button className={tab === id ? "active" : ""} key={id} onClick={() => dirty && tab !== id ? setModal({ type:"unsaved", next:id }) : setTab(id)}><Icon size={17}/>{label}</button>)}</nav><main>
      {tab === "profile" && <ProfileSection form={form} update={update} saving={saving} onSave={async () => { await save("profile"); await save("payments"); }}/>} 
      {tab === "schedule" && <ScheduleSection form={form} update={update} saving={saving} onSave={() => save("schedule")}/>} 
      {tab === "payments" && <PaymentsSection form={form} update={update} saving={saving} onSave={() => save("payments")} onPix={() => setModal({ type:"pix" })}/>} 
      {tab === "policies" && <PoliciesSection form={form} data={data} update={update} saving={saving} onSave={() => save("policies")}/>} 
      {tab === "communication" && <CommunicationSection form={form} setForm={setForm} setDirty={setDirty} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} saving={saving} save={save}/>} 
      {tab === "site" && <SiteSection form={form} update={update} saving={saving} onSave={() => save("site")}/>} 
      {tab === "admins" && <AdminsSection data={data} setModal={setModal} onSave={async (id, values, daily = false) => { try { if (daily) await saveAdminDailyPreference(id, values); else await saveAdminPreference(id, values); setMessage("Preferências da administradora atualizadas."); await load(); } catch (e) { setMessage(e.message); } }}/>} 
      {tab === "security" && <SecuritySection user={user} saving={saving} setSaving={setSaving} setMessage={setMessage} setModal={setModal}/>} 
    </main></div>
    {modal && <SettingsModal title={modal.type === "unsaved" ? "Alterações não salvas" : modal.type === "addAdmin" ? "Adicionar administrador" : modal.type === "removeAdmin" ? "Remover administrador" : modal.type === "pix" ? "Alterar dados Pix" : "Sair de todas as sessões"} onClose={() => setModal(null)}>
      {modal.type === "unsaved" && <><p>Existem alterações não salvas.</p><footer><button onClick={() => setModal(null)}>Continuar editando</button><button onClick={() => { setDirty(false); setTab(modal.next); setModal(null); }}>Descartar alterações</button><button className="primary" onClick={async () => { await save(tab); setTab(modal.next); setModal(null); }}>Salvar e sair</button></footer></>}
      {modal.type === "addAdmin" && <AdminEmailForm label="Promover conta existente" onSubmit={async (email) => { try { await setAdminRole(email,true); setModal(null); await load(); } catch (e) { setMessage(e.message); } }}/>} 
      {modal.type === "removeAdmin" && <><p>Remover a função administrativa de <strong>{modal.admin.email}</strong>? A conta não será excluída.</p><footer><button onClick={() => setModal(null)}>Voltar</button><button onClick={async () => { try { await setAdminRole(modal.admin.email,false); setModal(null); await load(); } catch (e) { setMessage(e.message); } }}>Remover função</button></footer></>}
      {modal.type === "pix" && <p>A chave Pix permanece protegida no servidor. Esta tela mostra somente o estado da configuração.</p>}
      {modal.type === "signout" && <><p>Você precisará entrar novamente em todos os dispositivos.</p><footer><button onClick={() => setModal(null)}>Cancelar</button><button className="primary" onClick={async () => { try { await signOutAllSessions(); } catch { setMessage("Não foi possível encerrar todas as sessões."); setModal(null); } }}>Sair de todas as sessões</button></footer></>}
    </SettingsModal>}
  </section></AdminLayout>;
}

function ProfileSection({ form, update, saving, onSave }) {
  return <SettingsSection title="Perfil do estúdio" subtitle="Informações públicas e dados privados do atendimento." onSave={onSave} saving={saving}><Grid>
    {[["studio_name","Nome do estúdio"],["professional_name","Nome profissional"],["tagline","Frase curta"],["contact_email","E-mail de contato"],["phone","Telefone"],["instagram","Instagram"],["neighborhood","Bairro"],["city","Cidade"],["state","Estado"],["map_link","Link do mapa"]].map(([key,label]) => <Field key={key} label={label} value={form.profile[key] || ""} onChange={(v) => update("profile",key,v)}/>)}
    <Field wide label="Descrição" textarea value={form.profile.description || ""} onChange={(v) => update("profile","description",v)}/>
  </Grid><PrivateAddress value={form.payments.full_address || ""} onChange={(v) => update("payments","full_address",v)}/></SettingsSection>;
}

function PrivateAddress({ value, onChange }) {
  const [visible, setVisible] = useState(false);
  return <aside className="settings-private settings-private-address"><header><div><span>Informação privada</span><h3>Endereço completo do atendimento</h3></div><button type="button" onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>} {visible ? "Ocultar" : "Mostrar"}</button></header><p>Esta informação é privada e só será enviada às clientes com agendamento confirmado.</p><textarea rows="4" aria-label="Endereço completo do atendimento" value={value} onChange={(e) => onChange(e.target.value)} style={visible ? undefined : { WebkitTextSecurity:"disc" }}/></aside>;
}

function PoliciesSection({ form, data, update, saving, onSave }) {
  return <SettingsSection title="Políticas" subtitle="Revise com atenção os textos apresentados antes de cada aceite." onSave={onSave} saving={saving}><p className="policy-notice">As alterações serão aplicadas apenas aos próximos aceites. Os registros antigos continuarão vinculados à versão aceita na época.</p><div className="policy-cards">{Object.entries(policyInfo).map(([key,[title,help]]) => { const active = data.policies.find((p) => p.policy_type === key && p.is_active); const value = form.policies[key] || ""; return <article key={key}><header><div><h3>{title}</h3><p>{help}</p></div><span>Versão ativa: {active?.version || 1}</span></header><textarea rows="7" value={value} onChange={(e) => update("policies",key,e.target.value)}/><footer><span>{value.length} caracteres</span><span>{active?.created_at ? `Atualizada em ${new Date(active.created_at).toLocaleDateString("pt-BR")}` : "Data não disponível"}</span></footer></article>; })}</div></SettingsSection>;
}

function SecuritySection({ user, saving, setSaving, setMessage, setModal }) {
  return <SettingsSection title="Segurança" subtitle="Gerencie separadamente o e-mail e a senha da conta administrativa."><div className="security-sections"><AccountEmailForm currentEmail={user?.email || ""} setMessage={setMessage}/><PasswordForm saving={saving} onSubmit={async (password) => { setSaving(true); try { await updatePassword(password); setMessage("Senha atualizada com sucesso."); } catch { setMessage("Não foi possível atualizar sua senha."); } finally { setSaving(false); } }}/><article className="security-card"><h3>Sessões abertas</h3><p>Encerre o acesso da conta em todos os dispositivos por segurança.</p><button type="button" onClick={() => setModal({ type:"signout" })}>Sair de todas as sessões</button></article></div></SettingsSection>;
}

function AccountEmailForm({ currentEmail, setMessage }) {
  const [email, setEmail] = useState(""); const [saving, setSaving] = useState(false);
  return <form className="security-card" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await updateAccountEmail(email); setEmail(""); setMessage("Enviamos uma confirmação para o novo e-mail. A alteração será concluída após a confirmação."); } catch { setMessage("Não foi possível iniciar a alteração do e-mail."); } finally { setSaving(false); } }}><h3>E-mail da conta</h3><p>Conta atual: <strong>{currentEmail}</strong></p><label>Novo e-mail<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label><small>A mudança só será concluída após a confirmação enviada pelo Supabase.</small><button className="primary" disabled={saving}>{saving ? "Enviando..." : "Alterar e-mail"}</button></form>;
}

function PasswordForm({ onSubmit, saving }) {
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState("");
  const score = useMemo(() => Number(password.length >= 8) + Number(/[A-Za-z]/.test(password)) + Number(/\d/.test(password)), [password]);
  return <form className="security-card password-form" onSubmit={(e) => { e.preventDefault(); if (score < 3 || password !== confirmation) { setError(password !== confirmation ? "As senhas informadas não são iguais." : "A senha precisa atender a todos os requisitos."); return; } setError(""); onSubmit(password); }}><h3>Senha da conta</h3><PasswordInput label="Nova senha" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} required/><PasswordInput label="Confirmar nova senha" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required/><div className={`password-meter password-meter--${score}`}><span/><strong>{score < 2 ? "Fraca" : score < 3 ? "Média" : "Forte"}</strong></div><ul><li className={password.length >= 8 ? "ok" : ""}>Mínimo de 8 caracteres</li><li className={/[A-Za-z]/.test(password) ? "ok" : ""}>Ao menos uma letra</li><li className={/\d/.test(password) ? "ok" : ""}>Ao menos um número</li></ul>{error && <p className="settings-field-error" role="alert">{error}</p>}<button className="primary" disabled={saving}>{saving ? "Salvando..." : "Atualizar senha"}</button></form>;
}

function ScheduleSection({ form, update, saving, onSave }) { return <SettingsSection title="Agenda e horários" subtitle="Defina o expediente padrão. Exceções continuam na Agenda." onSave={onSave} saving={saving}><div className="schedule-days">{days.map(([id,label]) => { const day=form.schedule.days[id] || {active:false}; return <article key={id}><label><input type="checkbox" checked={day.active} onChange={(e) => update("schedule","days",{...form.schedule.days,[id]:{...day,active:e.target.checked}})}/><strong>{label}</strong></label>{day.active && <div>{[["open","Abertura"],["break_start","Início do intervalo"],["break_end","Fim do intervalo"],["close","Fechamento"]].map(([key,text]) => <label key={key}>{text}<input type="time" value={day[key] || ""} onChange={(e) => update("schedule","days",{...form.schedule.days,[id]:{...day,[key]:e.target.value}})}/></label>)}</div>}</article>; })}</div><Grid><Field label="Grade em minutos" type="number" value={form.schedule.slot_interval} onChange={(v) => update("schedule","slot_interval",Number(v))}/><Field label="Duração mínima" type="number" value={form.schedule.minimum_duration} onChange={(v) => update("schedule","minimum_duration",Number(v))}/><Field label="Meses futuros" type="number" value={form.schedule.future_months} onChange={(v) => update("schedule","future_months",Number(v))}/></Grid><Link className="settings-link" to="/admin/agenda">Abrir configurações da Agenda</Link></SettingsSection>; }
function PaymentsSection({ form, update, saving, onSave, onPix }) { return <SettingsSection title="Pagamentos e Pix" subtitle="Dados sensíveis nunca são exibidos por completo." onSave={onSave} saving={saving}><div className="secret-status"><CreditCard/><div><strong>Chave Pix</strong><span>{form.payments.pix_configured ? "•••••••••••••••• · Configurada" : "Não configurada"}</span></div><button onClick={onPix}>Alterar dados</button></div><Grid>{[["pix_recipient_name","Nome da recebedora"],["pix_recipient_city","Cidade da recebedora"],["proof_deadline_minutes","Prazo do comprovante (minutos)"],["initial_status","Status inicial"]].map(([key,label]) => <Field key={key} label={label} value={form.payments[key] || ""} onChange={(v) => update("payments",key,v)}/>)}<Field wide textarea label="Mensagem de pagamento" value={form.payments.payment_message || ""} onChange={(v) => update("payments","payment_message",v)}/><Field wide textarea label="Mensagem após envio" value={form.payments.payment_sent_message || ""} onChange={(v) => update("payments","payment_sent_message",v)}/></Grid></SettingsSection>; }
function CommunicationSection({ form, setForm, setDirty, selectedTemplate, setSelectedTemplate, saving, save }) { const updateNotice=(index,key,value)=>{const list=[...form.notifications];list[index]={...list[index],[key]:value};setForm((x)=>({...x,notifications:list}));setDirty(true)}; return <SettingsSection title="Comunicação e e-mails" subtitle="A tela mostra apenas se cada integração está configurada." onSave={() => save("communication")} saving={saving}><div className="integration-grid">{Object.entries(form.payments.integration_status || {}).map(([key,value]) => <article key={key}><Bell/><strong>{key.replaceAll("_"," ")}</strong><span>{value ? "Configurado ✓" : "Pendente"}</span></article>)}</div><h3>Notificações administrativas</h3><div className="notification-list">{form.notifications.map((n,index) => <article key={n.id}><strong>{notificationLabels[n.id] || n.id}</strong><label><input type="checkbox" checked={n.panel_enabled} onChange={(e)=>updateNotice(index,"panel_enabled",e.target.checked)}/>Painel</label><label><input type="checkbox" checked={n.email_enabled} onChange={(e)=>updateNotice(index,"email_enabled",e.target.checked)}/>E-mail</label><select value={n.priority} onChange={(e)=>updateNotice(index,"priority",e.target.value)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></article>)}</div><button onClick={() => save("notifications")}>Salvar notificações</button><h3>Modelos de e-mail</h3><select value={selectedTemplate?.id || ""} onChange={(e)=>setSelectedTemplate(form.templates.find((t)=>t.id===e.target.value))}>{form.templates.map((t)=><option key={t.id} value={t.id}>{t.id}</option>)}</select>{selectedTemplate && <Grid><Field label="Assunto" value={selectedTemplate.subject} onChange={(v)=>{setSelectedTemplate({...selectedTemplate,subject:v});setDirty(true)}}/><Field label="Título" value={selectedTemplate.title} onChange={(v)=>{setSelectedTemplate({...selectedTemplate,title:v});setDirty(true)}}/><Field wide textarea label="Texto principal" value={selectedTemplate.body} onChange={(v)=>{setSelectedTemplate({...selectedTemplate,body:v});setDirty(true)}}/><Field wide label="Assinatura" value={selectedTemplate.signature} onChange={(v)=>{setSelectedTemplate({...selectedTemplate,signature:v});setDirty(true)}}/></Grid>}</SettingsSection>; }
function SiteSection({ form, update, saving, onSave }) { return <SettingsSection title="Site" subtitle="Edite textos sem alterar as rotas técnicas." onSave={onSave} saving={saving}><Grid>{[["home_title","Título da Home"],["home_subtitle","Subtítulo"],["primary_button","Botão principal"],["gallery_button","Botão da Galeria"],["instagram_call","Chamada do Instagram"],["contact_text","Texto de Contato"]].map(([key,label])=><Field key={key} label={label} value={form.site[key] || ""} onChange={(v)=>update("site",key,v)}/>)}</Grid><div className="settings-shortcuts"><Link to="/admin/galeria">Gerenciar Galeria</Link><Link to="/admin/servicos">Gerenciar Serviços</Link><Link to="/admin/promocoes">Gerenciar Promoções</Link></div></SettingsSection>; }
function AdminsSection({ data, setModal, onSave }) { return <SettingsSection title="Administradores" subtitle="As administradoras possuem as mesmas permissões; as preferências controlam somente notificações."><button className="primary" onClick={()=>setModal({type:"addAdmin"})}>Adicionar administrador</button><div className="admin-list">{data.admins.map((a)=>{const saved=data.admin_preferences?.find((p)=>p.admin_user_id===a.id);const values=saved||{panel_notifications_enabled:true,email_notifications_enabled:false,is_active:true,show_daily_verse:true,daily_summary_email_enabled:false,end_of_day_email_enabled:false,show_closing_message:true};const toggle=(key,value,daily=false)=>onSave(a.id,{...values,[key]:value},daily);return <article key={a.id}><span>{(a.name || "A").slice(0,2).toUpperCase()}</span><div><strong>{a.name}</strong><p>{a.email}</p><small>Criado em {new Date(a.created_at).toLocaleDateString("pt-BR")}</small><label><input type="checkbox" defaultChecked={values.panel_notifications_enabled} onChange={(e)=>toggle("panel_notifications_enabled",e.target.checked)}/> Notificações no painel</label><label><input type="checkbox" defaultChecked={values.email_notifications_enabled} onChange={(e)=>toggle("email_notifications_enabled",e.target.checked)}/> Notificações por e-mail</label><label><input type="checkbox" defaultChecked={values.show_daily_verse} onChange={(e)=>toggle("show_daily_verse",e.target.checked,true)}/> Mostrar versículo no Dashboard</label><label><input type="checkbox" defaultChecked={values.daily_summary_email_enabled} onChange={(e)=>toggle("daily_summary_email_enabled",e.target.checked,true)}/> Receber resumo diário por e-mail</label><label><input type="checkbox" defaultChecked={values.end_of_day_email_enabled} onChange={(e)=>toggle("end_of_day_email_enabled",e.target.checked,true)}/> Receber resumo de encerramento</label><label><input type="checkbox" defaultChecked={values.show_closing_message} onChange={(e)=>toggle("show_closing_message",e.target.checked,true)}/> Mostrar mensagem de encerramento</label></div><em>{values.is_active?"Administrador ativo":"Inativo"}</em><button onClick={()=>setModal({type:"removeAdmin",admin:a})}>Remover função</button></article>})}</div></SettingsSection>; }

function SettingsSection({title,subtitle,onSave,saving,children}) { return <section className="settings-section"><header><h2>{title}</h2><p>{subtitle}</p></header>{children}{onSave && <footer><button className="primary" disabled={saving} onClick={onSave}>{saving ? "Salvando..." : "Salvar alterações"}</button></footer>}</section>; }
function Grid({children}) { return <div className="settings-grid">{children}</div>; }
function Field({label,value,onChange,textarea=false,wide=false,type="text"}) { return <label className={wide ? "wide" : ""}>{label}{textarea ? <textarea rows="4" value={value} onChange={(e)=>onChange(e.target.value)}/> : <input type={type} value={value} onChange={(e)=>onChange(e.target.value)}/>}</label>; }
function SettingsModal({title,onClose,children}) { return <Modal isOpen onClose={onClose} title={title} className="settings-modal" overlayClassName="settings-overlay">{children}</Modal>; }
function AdminEmailForm({label,onSubmit}) { const [email,setEmail]=useState(""); return <form onSubmit={(e)=>{e.preventDefault();onSubmit(email)}}><label>{label}<input required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)}/></label><footer><button className="primary">Confirmar</button></footer></form>; }
