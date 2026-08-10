import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import Layout from "../layouts/Layout";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../lib/supabase";
import BrandLogo from "../components/BrandLogo/BrandLogo";
import PasswordInput from "../components/PasswordInput/PasswordInput";
import { getSignUpError, isStrongRegistrationPassword, isValidRegistrationEmail, registerCustomer, SIGN_UP_MESSAGES } from "../services/authRegistration";
import "./Auth.css";

const getAccountRoute = (accountUser) =>
  accountUser?.app_metadata?.role === "admin" ? "/admin" : "/minha-conta";

const REMEMBERED_EMAIL_KEY = "beauty-studio-remembered-email";

const getLoginErrorMessage = (authError) => {
  const errorCode = authError?.code?.toLowerCase() || "";
  const errorMessage = authError?.message?.toLowerCase() || "";

  if (
    errorCode === "user_already_exists" ||
    errorMessage.includes("already registered") ||
    errorMessage.includes("already exists")
  ) {
    return "Este e-mail já está cadastrado. Entre na sua conta para continuar.";
  }

  if (
    errorCode === "weak_password" ||
    errorMessage.includes("password") ||
    errorMessage.includes("senha")
  ) {
    return "A senha informada é inválida. Use pelo menos 6 caracteres.";
  }

  if (
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("fetch")
  ) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível entrar. Confira seu e-mail e sua senha.";
};

function Auth({ mode }) {
  const isSignUp = mode === "signup";
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRoute = typeof location.state?.from === "string" ? location.state.from : null;
  const rememberedEmail = !isSignUp ? localStorage.getItem(REMEMBERED_EMAIL_KEY) || "" : "";
  const [formData, setFormData] = useState({
    name: "",
    email: rememberedEmail,
    password: "",
  });
  const [rememberEmail, setRememberEmail] = useState(Boolean(rememberedEmail));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpStarted, setSignUpStarted] = useState(false);
  const [completedUser, setCompletedUser] = useState(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [errorField, setErrorField] = useState(null);
  const emailRef = useRef(null);

  const handleAccessAccount = () => {
    if (!completedUser) return;

    navigate(getAccountRoute(completedUser), { replace: true });
  };

  useEffect(() => {
    if (!completedUser) return undefined;

    const redirectTimer = window.setTimeout(() => {
      navigate(getAccountRoute(completedUser), { replace: true });
    }, 5000);

    return () => window.clearTimeout(redirectTimer);
  }, [completedUser, navigate]);

  if (user && (!isSignUp || !signUpStarted)) {
    return <Navigate to={requestedRoute || getAccountRoute(user)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setErrorField(null);
    setExistingAccount(false);

    if (isSignUp && !isValidRegistrationEmail(formData.email)) {
      setError(SIGN_UP_MESSAGES.invalidEmail);
      setErrorField("email");
      emailRef.current?.focus();
      return;
    }
    if (isSignUp && !isStrongRegistrationPassword(formData.password)) {
      setError(SIGN_UP_MESSAGES.weakPassword);
      setErrorField("password");
      document.getElementById("registration-password")?.focus();
      return;
    }
    setSubmitting(true);

    if (isSignUp) {
      setSignUpStarted(true);
    }

    try {
      if (isSignUp) {
        const data = await registerCustomer(formData);

        if (!data.session?.user) {
          navigate("/entrar", { replace: true, state: { message: "Sua conta foi criada. Entre com seu e-mail e sua senha para continuar." } });
          return;
        }

        setCompletedUser(data.session.user);
        return;
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: formData.password,
          });

        if (signInError) throw signInError;

        if (rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

        navigate(location.state?.from || getAccountRoute(data.user), {
          replace: true,
        });
      }
    } catch (authError) {
      setSignUpStarted(false);
      if (import.meta.env.DEV) console.error("Falha de autenticação:", authError?.code || "sem código");
      if (isSignUp) {
        const safeError = getSignUpError(authError);
        if (safeError.type === "existing-account") setExistingAccount(true);
        else setError(safeError.message);
        setErrorField(safeError.field);
        if (safeError.field === "email") emailRef.current?.focus();
        if (safeError.field === "password") document.getElementById("registration-password")?.focus();
      } else {
        setError(getLoginErrorMessage(authError));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (completedUser) {
    return (
      <Layout>
        <main className="auth-page">
          <section
            className="auth-card auth-success"
            role="status"
            aria-live="polite"
          >
            <div className="auth-brand">
              <BrandLogo />
            </div>

            <CheckCircle2 className="auth-success__icon" aria-hidden="true" />
            <h1>Conta criada com sucesso! 🤎</h1>
            <p>Seu espaço no Beauty Studio já está pronto.</p>
            <p>Que bom ter você por aqui! Seu espaço no Beauty Studio foi criado com sucesso.</p>

            <button
              type="button"
              className="auth-success__button"
              onClick={handleAccessAccount}
            >
              Continuar
            </button>
          </section>
        </main>
      </Layout>
    );
  }

  if (existingAccount) {
    return (
      <Layout><main className="auth-page"><section className="auth-card auth-success" role="alert">
        <div className="auth-brand"><BrandLogo /></div>
        <h1>Este e-mail já possui uma conta</h1>
        <p>Entre com sua senha ou recupere o acesso caso não se lembre dela.</p>
        <div className="auth-existing-actions"><Link to="/entrar">Entrar</Link><Link to="/recuperar-senha" className="secondary">Recuperar senha</Link></div>
      </section></main></Layout>
    );
  }

  return (
    <Layout>
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <BrandLogo />
          </div>

          <h1>{isSignUp ? "Crie sua conta" : "Que bom ter você aqui"}</h1>
          <p>
            {isSignUp
              ? "Cadastre-se para acompanhar seus atendimentos."
              : "Entre para acessar o seu espaço."}
          </p>
          {!isSignUp && location.state?.message && <p className="auth-feedback" role="status">{location.state.message}</p>}

          <form
            onSubmit={handleSubmit}
            autoComplete={isSignUp ? "off" : "on"}
          >
            {isSignUp && (
              <label>
                Nome
                <input
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
            )}

            <label>
              E-mail
              <input
                ref={emailRef}
                required
                type="email"
                autoComplete={isSignUp ? "email" : "username"}
                value={formData.email}
                aria-invalid={errorField === "email"}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>

            <PasswordInput
              label="Senha"
              id={isSignUp ? "registration-password" : undefined}
              required
              minLength={isSignUp ? 8 : 6}
              aria-invalid={errorField === "password"}
              name={
                isSignUp
                  ? "password"
                  : "password"
              }
              autoComplete={isSignUp ? "off" : "current-password"}
              autoCorrect="off"
              autoCapitalize={isSignUp ? "none" : "off"}
              spellCheck={false}
              value={formData.password}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />

            {!isSignUp && (
              <div className="auth-login-options">
                <label className="auth-remember-email"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} />Lembrar meu e-mail</label>
                <Link className="auth-forgot-password" to="/recuperar-senha">Esqueceu sua senha?</Link>
              </div>
            )}

            {!isSignUp && <small className="auth-password-manager">A senha pode ser preenchida pelo gerenciador seguro do seu navegador.</small>}

            {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}

            <button disabled={submitting}>
              {submitting
                ? isSignUp ? "Criando sua conta..." : "Entrando..."
                : isSignUp
                  ? "Cadastrar-se"
                  : "Entrar"}
            </button>
          </form>

          <p className="auth-switch">
            {isSignUp ? "Já possui uma conta?" : "Ainda não possui uma conta?"}{" "}
            <Link to={isSignUp ? "/entrar" : "/cadastro"}>
              {isSignUp ? "Entrar" : "Cadastrar-se"}
            </Link>
          </p>
        </section>
      </main>
    </Layout>
  );
}

export default Auth;
