import { Link } from "react-router-dom";
import "./PromotionBanner.css";

export default function PromotionBanner({ promotion }) {
  if (!promotion) return null;
  return <section className="promotion-banner"><span>OFERTA ESPECIAL</span><h2>{promotion.title}</h2><p>{promotion.short_description}</p>{promotion.ends_at&&<small>Válida até {new Date(promotion.ends_at).toLocaleDateString("pt-BR")}</small>}<Link to={promotion.button_target||"/servicos"}>{promotion.button_text||"Ver promoção"}</Link></section>;
}
