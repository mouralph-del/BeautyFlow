import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput/PasswordInput";
import { useAuth } from "../contexts/useAuth";
import Layout from "../layouts/Layout";
import { getOwnCustomerProfile, saveOwnCustomerProfile } from "../services/customerProfile";
import { signOutAllSessions, updateAccountEmail, updatePassword } from "../services/settings";
import "./CustomerAccount.css";

export default function CustomerSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ fullName: "", phone: "" });
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const score = useMemo(() => Number(password.length >= 8) + Number(/[A-Za-zÀ-ÿ]/.test(password)) + Number(/\d/.test(password)), [password]);

  useEffect(() => {
    getOwnCustomerProfile().then((result) => setProfile({ fullName: result?.full_name || user?.user_metadata?.name || "", phone: result?.phone || "" })).catch(() => setError("Não foi possível carregar seus dados agora."));
  }, [user]);

  const runAction = async (action, success) => {
    setError(""); setMessage("");
    try { await action(); setMessage(success); return true; }
    catch { setError("Não foi possível concluir esta alteração. Tente novamente em instantes."); return false; }
  };

  const updateCustomerPassword = async (event) => {
    event.preventDefault();
    if (score < 3 || password !== confirmation) { setError(password !== confirmation ? "As senhas informadas não são iguais." : "Use pelo menos 8 caracteres, uma letra e um número."); return; }
    if (await runAction(() => updatePassword(password), "Senha atualizada com sucesso.")) { setPassword(""); setConfirmation(""); }
  };

  return <Layout><main className="customer-account-page customer-settings">
    <header className="customer-page-hero"><span>Seu perfil</span><h1>Configurações</h1><p>Gerencie seus dados e preferências.</p></header>
    {(message || error) && <p role={error ? "alert" : "status"} className={`customer-form-message${error ? " is-error" : ""}`}>{error || message}</p>}
    <section className="customer-settings-card"><div className="customer-settings-card__title"><UserRound /><div><h2>Perfil</h2><p>Seus dados pessoais usados nos atendimentos.</p></div></div>
      <div className="customer-photo-editor"><span className="customer-photo customer-photo--static">{profile.fullName.charAt(0).toUpperCase() || "C"}</span><div><strong>Foto de perfil</strong><p>O envio de foto ficará disponível quando houver armazenamento seguro conectado.</p></div></div>
      <form className="customer-form" onSubmit={(event) => { event.preventDefault(); runAction(() => saveOwnCustomerProfile(profile), "Dados pessoais atualizados com sucesso."); }}><label>Nome completo<input required autoComplete="name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label><label>Telefone<input type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><button type="submit">Salvar alterações</button></form>
    </section>
    <section className="customer-settings-card"><div className="customer-settings-card__title"><LockKeyhole /><div><h2>Conta</h2><p>Gerencie separadamente seu e-mail e sua senha.</p></div></div>
      <form className="customer-form customer-form--compact" onSubmit={(event) => { event.preventDefault(); runAction(() => updateAccountEmail(email), "Confira o novo e-mail para confirmar a alteração."); }}><label><Mail size={16} /> E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button type="submit">Alterar e-mail</button></form>
      <form className="customer-password-form" onSubmit={updateCustomerPassword}><PasswordInput label="Nova senha" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={password} onChange={(event) => setPassword(event.target.value)} required /><PasswordInput label="Confirmar nova senha" autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /><div className={`customer-password-meter customer-password-meter--${score}`}><span /><strong>{score < 2 ? "Fraca" : score < 3 ? "Média" : "Forte"}</strong></div><ul><li className={password.length >= 8 ? "ok" : ""}>Mínimo de 8 caracteres</li><li className={/[A-Za-zÀ-ÿ]/.test(password) ? "ok" : ""}>Ao menos uma letra</li><li className={/\d/.test(password) ? "ok" : ""}>Ao menos um número</li></ul><button type="submit">Alterar senha</button></form>
    </section>
    <section className="customer-settings-card"><div className="customer-settings-card__title"><ShieldCheck /><div><h2>Segurança</h2><p>Informações seguras da sua conta.</p></div></div><dl className="customer-security"><div><dt>Cliente desde</dt><dd>{user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR", { month:"long", year:"numeric" }) : "—"}</dd></div><div><dt>Último acesso</dt><dd>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "—"}</dd></div></dl><button className="customer-secondary-action" type="button" onClick={async () => { if (await runAction(signOutAllSessions, "")) navigate("/entrar"); }}>Sair de todos os dispositivos</button></section>
  </main></Layout>;
}
