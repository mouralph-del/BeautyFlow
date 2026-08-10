import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import BrandLogo from "../components/BrandLogo/BrandLogo";
import PasswordInput from "../components/PasswordInput/PasswordInput";
import Layout from "../layouts/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import { getRecoveryErrorMessage, updateRecoveredPassword } from "../services/passwordRecovery";
import "./Auth.css";

const passwordValid = (password) =>
  password.length >= 8 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);

function NewPassword() {
  const { passwordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [recoveryValid, setRecoveryValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => {
    if (!password) return { level: 0, label: "" };
    const score = [password.length >= 8, /[A-Za-zÀ-ÿ]/.test(password), /\d/.test(password), password.length >= 12].filter(Boolean).length;
    if (score <= 1) return { level: 1, label: "Senha fraca" };
    if (score <= 3) return { level: 2, label: "Senha média" };
    return { level: 3, label: "Senha forte" };
  }, [password]);

  useEffect(() => {
    let active = true;
    const hashIsRecovery = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
    const queryHasCode = new URLSearchParams(window.location.search).has("code");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) setRecoveryValid(true);
      setChecking(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session && (hashIsRecovery || queryHasCode)) setRecoveryValid(true);
      window.setTimeout(() => active && setChecking(false), 300);
    }).catch(() => active && setChecking(false));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (passwordRecovery) {
      setRecoveryValid(true);
      setChecking(false);
    }
  }, [passwordRecovery]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!recoveryValid) { setError("Este link expirou ou é inválido."); return; }
    if (!passwordValid(password)) { setError("Use pelo menos 8 caracteres, contendo uma letra e um número."); return; }
    if (password !== confirmation) { setError("As senhas informadas não são iguais."); return; }
    setSubmitting(true);
    try {
      await updateRecoveredPassword(password);
      setCompleted(true);
      setRecoveryValid(false);
    } catch (updateError) {
      setError(getRecoveryErrorMessage(updateError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand"><BrandLogo /></div>
          {checking ? <p>Validando link de recuperação...</p> : completed ? (
            <div className="auth-recovery-result" role="status" aria-live="polite">
              <h1>Senha alterada com sucesso.</h1>
              <Link to="/entrar" className="auth-success__button">Ir para Login</Link>
            </div>
          ) : !recoveryValid ? (
            <div className="auth-recovery-result">
              <h1>Este link expirou ou é inválido.</h1>
              <Link to="/recuperar-senha" className="auth-success__button">Solicitar novo link</Link>
            </div>
          ) : (
            <>
              <h1>Crie uma nova senha</h1>
              <p>Use uma senha segura para voltar a acessar sua conta.</p>
              <form onSubmit={handleSubmit}>
                <PasswordInput label="Nova senha" required autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={password} onChange={(event) => setPassword(event.target.value)} />
                <PasswordInput label="Confirmar senha" required autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
                {strength.label && <div className={`password-strength password-strength--${strength.level}`}><span aria-hidden="true" /><small>{strength.label}</small></div>}
                {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
                <button disabled={submitting}>{submitting ? "Alterando senha..." : "Alterar senha"}</button>
              </form>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default NewPassword;
