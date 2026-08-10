import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BrandLogo from "../components/BrandLogo/BrandLogo";
import Layout from "../layouts/Layout";
import { getRecoveryErrorMessage, requestPasswordRecovery } from "../services/passwordRecovery";
import "./Auth.css";

function RecoverPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await requestPasswordRecovery(email);
      setCompleted(true);
    } catch (requestError) {
      setError(getRecoveryErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand"><BrandLogo /></div>
          <h1>Esqueceu sua senha?</h1>
          {completed ? (
            <div className="auth-recovery-result" role="status" aria-live="polite">
              <p>Se existir uma conta vinculada a este e-mail, um link de recuperação foi enviado.</p>
              <Link to="/entrar" className="auth-success__button">Voltar ao Login</Link>
            </div>
          ) : (
            <>
              <p>Informe o e-mail utilizado no cadastro. Se existir uma conta vinculada a este e-mail, você receberá uma mensagem com as instruções para criar uma nova senha.</p>
              <form onSubmit={handleSubmit}>
                <label>
                  E-mail
                  <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
                <div className="auth-form-actions">
                  <button type="button" className="auth-secondary-button" onClick={() => navigate("/entrar")}>Cancelar</button>
                  <button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Receber e-mail"}</button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

export default RecoverPassword;
