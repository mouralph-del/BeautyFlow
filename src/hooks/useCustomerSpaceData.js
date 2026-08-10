import { useCallback, useEffect, useMemo, useState } from "react";
import { getCustomerSpace } from "../services/customerSpace";
import { toAppointmentDate } from "../utils/customerAppointments";

export default function useCustomerSpaceData() {
  const [data, setData] = useState({ appointments: [], promotion: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try { setData(await getCustomerSpace()); }
    catch { setError("Não foi possível carregar seu espaço agora. Tente novamente em instantes."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const appointments = useMemo(
    () => [...data.appointments].sort((a, b) => toAppointmentDate(b) - toAppointmentDate(a)),
    [data.appointments]
  );

  return { ...data, appointments, loading, error, refresh };
}
