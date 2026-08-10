import { useEffect, useRef } from "react";
import { CalendarDays, Heart, LogOut, Settings, X } from "lucide-react";
import Avatar from "../Avatar/Avatar";
import { NavLink } from "react-router-dom";

export default function CustomerAccountDrawer({ open, onClose, onSignOut, name, user }) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "recentemente";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initial = name ? name.charAt(0) : "";

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll("button, a[href]");
    focusable?.[0]?.focus();
    const trapFocus = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current?.(); return; }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    drawer?.addEventListener("keydown", trapFocus);
    return () => { drawer?.removeEventListener("keydown", trapFocus); document.body.style.overflow = previousOverflow; previousFocusRef.current?.focus?.(); };
  }, [open]);

  return (
    <div className={`customer-drawer-layer${open ? " is-open" : ""}`} aria-hidden={!open}>
      <button className="customer-drawer-backdrop" type="button" aria-label="Fechar menu" onClick={onClose} />
      <aside ref={drawerRef} className="customer-drawer" aria-modal="true" role="dialog" aria-labelledby="customer-drawer-title" aria-describedby="customer-drawer-description" tabIndex={-1}>
        <button className="customer-drawer__close" type="button" onClick={onClose} aria-label="Fechar menu"><X /></button>
        <header>
          <span className="customer-drawer__avatar"><Avatar src={avatarUrl} name={name} initials={initial} size={58} /></span>
          <div><strong id="customer-drawer-title">{name}</strong><small id="customer-drawer-description">Cliente desde {memberSince}</small></div>
        </header>
        <nav>
          <NavLink to="/minha-conta" end><Heart /> Meu Espaço</NavLink>
          <NavLink to="/minha-conta/agendamentos"><CalendarDays /> Meus Agendamentos</NavLink>
          <NavLink to="/minha-conta/configuracoes"><Settings /> Configurações</NavLink>
        </nav>
        <button className="customer-drawer__logout" type="button" onClick={onSignOut}><LogOut /> Sair</button>
        <blockquote>“A verdadeira beleza está nos detalhes e no cuidado com cada cliente. 🤎”</blockquote>
      </aside>
    </div>
  );
}
