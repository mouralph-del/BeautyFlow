import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "../BrandLogo/BrandLogo";
import Container from "../Container/Container";
import CustomerAccountDrawer from "../CustomerSpace/CustomerAccountDrawer";
import { useAuth } from "../../contexts/useAuth";
import usePublicSettings from "../../hooks/usePublicSettings";
import useAccessibleDrawer from "../../hooks/useAccessibleDrawer";
import "./Header.css";

function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useAccessibleDrawer(mobileMenuOpen, () => setMobileMenuOpen(false));
  const { studio } = usePublicSettings();
  const menu = studio.site.menu;
  const fullName = user?.user_metadata?.name?.trim() || user?.email?.split("@")[0] || "Cliente";
  const name = fullName.split(/\s+/)[0];
  const isAdmin = user?.app_metadata?.role === "admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/entrar");
  };

  useEffect(() => {
    setDrawerOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {isAdmin && (
        <aside className="public-admin-bar" aria-label="Visualização administrativa">
          <span>Visualizando o site como administradora</span>
          <div><Link to="/admin">Voltar ao painel</Link><button type="button" onClick={handleSignOut}>Sair</button></div>
        </aside>
      )}
      <header className="header">
        <Container>
          <div className="header__content">
            <Link to="/" className="header-brand"><span className="header-brand__logo-frame"><BrandLogo className="header-brand__logo" /></span></Link>
            <button type="button" className="header-menu-button" aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
              {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
            <nav id="mobile-navigation" ref={mobileMenuRef} tabIndex="-1" className={`header__nav${mobileMenuOpen ? " is-open" : ""}`} aria-label="Navegação principal">
              <NavLink to="/" end>{menu.home}</NavLink><NavLink to="/servicos">Serviços</NavLink><NavLink to="/minha-historia">Minha História</NavLink><NavLink to="/galeria">{menu.gallery}</NavLink><NavLink to="/contato">{menu.contact}</NavLink>
              {!user && <div className="header__mobile-auth"><Link to="/entrar">Entrar</Link><Link to="/cadastro" className="header-signup">Cadastrar-se</Link></div>}
            </nav>
            {!user ? (
              <div className="header-auth-actions"><Link to="/entrar">Entrar</Link><Link to="/cadastro" className="header-signup">Cadastrar-se</Link></div>
            ) : !isAdmin ? (
              <div className="header-account"><button type="button" className="header-account__trigger" aria-label="Abrir menu da cliente" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}><span className="header-avatar">{name.charAt(0).toUpperCase()}</span><span>Olá, {name}</span></button></div>
            ) : <span className="header-admin-spacer" />}
          </div>
        </Container>
      </header>
      {mobileMenuOpen && <button type="button" className="header-menu-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
      {user && !isAdmin && <CustomerAccountDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSignOut={handleSignOut} name={fullName} user={user} />}
    </>
  );
}

export default Header;
