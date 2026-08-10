import { useEffect, useState } from "react";
import { getActivePromotions } from "../services/promotions";

export default function usePromotions(target) {
  const [promotions, setPromotions] = useState([]);
  useEffect(() => {
    let active = true;
    getActivePromotions(target)
      .then((items) => active && setPromotions(items))
      .catch(() => console.error("Não foi possível carregar as promoções."));
    return () => { active = false; };
  }, [target]);
  return promotions;
}
