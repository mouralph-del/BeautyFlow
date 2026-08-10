import { useEffect, useState } from "react";
import staticServices from "../data/services";
import { getServiceRecords, mapServiceRecord } from "../services/serviceCatalog";

export default function useServiceCatalog() {
  const [services, setServices] = useState(staticServices);

  useEffect(() => {
    let active = true;
    getServiceRecords().then((records) => {
      if (!active || !records.length) return;
      const details = new Map(staticServices.map((item) => [item.slug, item]));
      setServices(records.map((record) => mapServiceRecord(record, details.get(record.slug))));
    }).catch(() => console.error("Não foi possível carregar os serviços."));
    return () => { active = false; };
  }, []);

  return services;
}
