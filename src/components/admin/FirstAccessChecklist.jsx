import { useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardCheck, EyeOff } from "lucide-react";
import "./FirstAccessChecklist.css";

const STORAGE_KEY = "beautyflow.admin.first-access-checklist.v1";
const VISIBILITY_KEY = "beautyflow.admin.first-access-checklist.hidden.v1";
const items = ["Conferir horários de funcionamento", "Conferir serviços cadastrados", "Conferir preços", "Conferir benefícios", "Conferir promoções", "Conferir galeria", "Conferir contato", "Fazer um agendamento de teste", "Validar Pix", "Publicar o link do BeautyFlow no Instagram"];
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

export default function FirstAccessChecklist() {
  const [completed, setCompleted] = useState(() => readStored(STORAGE_KEY, []));
  const [hidden, setHidden] = useState(() => readStored(VISIBILITY_KEY, false));
  const done = completed.length === items.length;
  const toggle = (item) => setCompleted((current) => { const next = current.includes(item) ? current.filter((value) => value !== item) : [...current, item]; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next; });
  const setVisibility = (value) => { setHidden(value); localStorage.setItem(VISIBILITY_KEY, JSON.stringify(value)); };
  if (hidden) return <button type="button" className="first-access-reopen" onClick={() => setVisibility(false)}><ClipboardCheck /> Abrir checklist de primeiro acesso <ChevronDown /></button>;
  return <section className={`first-access-checklist ${done ? "is-complete" : ""}`} aria-labelledby="first-access-title"><header><div><span>PRIMEIROS PASSOS</span><h2 id="first-access-title">{done ? "Parabéns! Seu BeautyFlow está pronto para atender clientes." : "Checklist de primeiro acesso"}</h2><p>{done ? "Todas as conferências iniciais foram marcadas como concluídas." : `${completed.length} de ${items.length} etapas concluídas`}</p></div><button type="button" onClick={() => setVisibility(true)} aria-label="Ocultar checklist"><EyeOff /> Ocultar</button></header>{!done && <div className="first-access-progress" role="progressbar" aria-valuemin="0" aria-valuemax={items.length} aria-valuenow={completed.length}><span style={{ width: `${completed.length / items.length * 100}%` }} /></div>}<div className="first-access-items">{items.map((item) => <label key={item} className={completed.includes(item) ? "checked" : ""}><input type="checkbox" checked={completed.includes(item)} onChange={() => toggle(item)} /><CheckCircle2 aria-hidden="true" /><span>{item}</span></label>)}</div></section>;
}
