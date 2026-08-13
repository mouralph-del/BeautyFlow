import {
  CalendarDays,
  CircleDollarSign,
  GalleryHorizontal,
  Globe2,
  Gift,
  Info,
  LayoutDashboard,
  MessageSquareMore,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import BrandLogo from "../BrandLogo/BrandLogo";
import useAccessibleDrawer from "../../hooks/useAccessibleDrawer";

const items = [
  { label: "Visão Geral", to: "/admin", icon: LayoutDashboard },
  { label: "Agenda", to: "/admin/agenda", icon: CalendarDays },
  { label: "Solicitações", to: "/admin/solicitacoes", icon: MessageSquareMore },
  { label: "Clientes", to: "/admin/clientes", icon: Users },
  { label: "Serviços", to: "/admin/servicos", icon: Scissors },
  { label: "Promoções", to: "/admin/promocoes", icon: Gift },
  { label: "Galeria", to: "/admin/galeria", icon: GalleryHorizontal },
  {
    label: "Financeiro",
    to: "/admin/financeiro",
    icon: CircleDollarSign,
  },
  { label: "Ver site", to: "/", icon: Globe2 },
  { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
  { label: "Sobre o BeautyFlow", to: "/admin/sobre", icon: Info },
];

function AdminSidebar({ open, onClose }) {
  const drawerRef = useAccessibleDrawer(open, onClose);
  return (
    <>
      {open && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Fechar menu"
          onClick={onClose}
        />
      )}

      <aside ref={drawerRef} className={`admin-sidebar ${open ? "is-open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open ? "true" : undefined} aria-label={open ? "Navegação administrativa" : undefined} tabIndex={open ? -1 : undefined}>
        <div className="admin-sidebar__brand">
          <Link to="/admin" onClick={onClose}>
            <BrandLogo />
          </Link>

          <button
            type="button"
            className="admin-sidebar__close"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Navegação administrativa">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end
              onClick={onClose}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <VerseCard />
      </aside>
    </>
  );
}

function VerseCard() {
  return (
    <blockquote className="verse-card">
      <p>“O Senhor é o meu pastor; nada me faltará.”</p>
      <cite>Salmos 23:1</cite>
    </blockquote>
  );
}

export { VerseCard };
export default AdminSidebar;
