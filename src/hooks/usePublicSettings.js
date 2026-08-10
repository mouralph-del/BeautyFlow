import { useEffect, useState } from "react";
import { getCachedPublicSettings, getPublicSettings, subscribePublicSettings } from "../services/settings";

export default function usePublicSettings() {
  const [data, setData] = useState(getCachedPublicSettings);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribePublicSettings((value) => active && setData(value));
    getPublicSettings().catch(() =>
      console.error("Não foi possível carregar as configurações públicas.")
    );
    return () => { active = false; unsubscribe(); };
  }, []);

  return data;
}
