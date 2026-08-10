import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import AuthContext from "./authContext";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        setSession(data.session);
      })
      .catch(() => {
        console.error("Não foi possível recuperar a sessão.");
        setSession(null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
      if (nextSession?.user && nextSession.user.app_metadata?.role !== "admin") {
        supabase.rpc("link_customer_history").then(({ error }) => {
          if (error) console.error("Não foi possível vincular o histórico da cliente.");
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      passwordRecovery,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading, passwordRecovery]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
