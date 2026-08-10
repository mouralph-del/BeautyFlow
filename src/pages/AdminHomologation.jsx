import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Download, TriangleAlert } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import { useAuth } from "../contexts/useAuth";
import { getAdminFirstName } from "../utils/dailyExperience";
import "./AdminHomologation.css";

const VERSION = "1.0";
const modules = [
  { title: "🏠 Área Pública", items: ["Home", "Serviços", "História", "Galeria", "Contato"] },
  { title: "👤 Cliente", items: ["Cadastro", "Login", "Agendamento", "Pix", "Histórico", "Configurações"] },
  { title: "👩‍💼 Administração", items: ["Dashboard", "Agenda", "Solicitações", "Clientes", "Serviços", "Galeria", "Promoções", "Financeiro", "Configurações", "Sobre"] },
  { title: "🤖 Automações", items: ["Versículo diário", "Bom dia", "Encerramento", "Lembretes", "Promoções"] },
].map((group, groupIndex) => ({ ...group, items: group.items.map((name, itemIndex) => ({ id: `${groupIndex}-${itemIndex}`, name })) }));
const allItems = modules.flatMap((group) => group.items);
const initialState = Object.fromEntries(allItems.map((item) => [item.id, { status: "not_tested", notes: "" }]));
const labels = { approved: "🟢 Aprovado", adjustment: "🟡 Precisa ajuste", not_tested: "🔴 Não testado" };

const loadState = (key) => { try { return { ...initialState, ...(JSON.parse(localStorage.getItem(key)) || {}) }; } catch { return initialState; } };
const escapeMarkdown = (value = "") => value.replaceAll("|", "\\|").replaceAll("\n", " ").trim();

export default function AdminHomologation() {
  const { user } = useAuth();
  const administrator = getAdminFirstName(user) || user?.email || "Administradora";
  const storageKey = `beautyflow.admin.homologation.v1.${user?.id || "local"}`;
  const [state, setState] = useState(() => loadState(storageKey));
  const approved = allItems.filter((item) => state[item.id]?.status === "approved").length;
  const adjustments = allItems.filter((item) => state[item.id]?.status === "adjustment").length;
  const pending = allItems.length - approved;
  const percentage = Math.round(approved / allItems.length * 100);
  const completed = approved === allItems.length;

  const save = (id, patch) => setState((current) => { const next = { ...current, [id]: { ...current[id], ...patch } }; localStorage.setItem(storageKey, JSON.stringify(next)); return next; });
  const report = useMemo(() => {
    const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
    const rows = modules.flatMap((group) => group.items.map((item) => `| ${group.title} | ${item.name} | ${labels[state[item.id]?.status]} | ${escapeMarkdown(state[item.id]?.notes) || "—"} |`));
    return [`# Relatório de Homologação — BeautyFlow`, "", `- Data: ${date}`, `- Versão: ${VERSION}`, `- Administrador: ${administrator}`, `- Resultado: ${approved}/${allItems.length} aprovados (${percentage}%)`, "", "## Resumo", "", `- Aprovados: ${approved}`, `- Precisam de ajuste: ${adjustments}`, `- Pendentes: ${pending}`, "", "## Itens", "", "| Módulo | Item | Status | Observações |", "|---|---|---|---|", ...rows, ""].join("\n");
  }, [administrator, adjustments, approved, pending, percentage, state]);
  const exportReport = () => { const url = URL.createObjectURL(new Blob([report], { type: "text/markdown;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `beautyflow-homologacao-v${VERSION}-${new Date().toISOString().slice(0,10)}.md`; link.click(); URL.revokeObjectURL(url); };

  return <AdminLayout><section className="homologation-page"><header className="homologation-header"><div><span>PRÉ-LANÇAMENTO</span><h1>Homologação</h1><p>Valide cada módulo antes do lançamento oficial do BeautyFlow.</p></div><button type="button" onClick={exportReport}><Download /> Exportar relatório</button></header><section className="homologation-summary" aria-label="Resumo da homologação"><article><ClipboardCheck/><span>Total de módulos</span><strong>{allItems.length}</strong></article><article><CheckCircle2/><span>Aprovados</span><strong>{approved}</strong></article><article><TriangleAlert/><span>Pendentes</span><strong>{pending}</strong></article><article><span>Percentual concluído</span><strong>{percentage}%</strong></article></section><div className="homologation-progress" role="progressbar" aria-label="Progresso da homologação" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percentage}><span style={{ width: `${percentage}%` }} /></div>{completed && <section className="homologation-complete" role="status"><h2>🎉 Homologação concluída com sucesso.</h2><p>A versão 1.0 está pronta para lançamento.</p></section>}<div className="homologation-groups">{modules.map((group) => <section className="homologation-group" key={group.title}><h2>{group.title}</h2><div>{group.items.map((item) => { const value = state[item.id] || initialState[item.id]; return <article className={`homologation-item is-${value.status}`} key={item.id}><header><label><input type="checkbox" checked={value.status === "approved"} onChange={(event) => save(item.id, { status: event.target.checked ? "approved" : "not_tested" })} /><span>{item.name}</span></label><select aria-label={`Status de ${item.name}`} value={value.status} onChange={(event) => save(item.id, { status: event.target.value })}>{Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></header><label className="homologation-notes">Observações<textarea rows="2" value={value.notes} maxLength="1000" placeholder="Registre algo que precise ser revisto." onChange={(event) => save(item.id, { notes: event.target.value })} /></label></article>; })}</div></section>)}</div></section></AdminLayout>;
}
