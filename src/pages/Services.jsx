import { useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import useServiceCatalog from "../hooks/useServiceCatalog";
import Layout from "../layouts/Layout";
import "./Services.css";
import usePromotions from "../hooks/usePromotions";
import { calculatePromotion } from "../services/promotions";

function Services() {
  const services = useServiceCatalog();
  const promotions = usePromotions("services");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const categories = [
    "Todos",
    "Sobrancelhas",
    "Cílios",
    "Micropigmentação",
    "Cuidados Faciais",
  ];

  const activeServices = services.filter((service) => service.active);

  const filteredServices =
    selectedCategory === "Todos"
      ? activeServices
      : activeServices.filter(
          (service) => service.category === selectedCategory
        );

  const getCategoryCount = (category) => {
    if (category === "Todos") {
      return activeServices.length;
    }

    return activeServices.filter(
      (service) => service.category === category
    ).length;
  };

  return (
    <Layout>
      <main className="services-page">
        <div className="services-back-wrapper">
          <Link to="/" className="services-back-button">
            <ArrowLeft size={18} strokeWidth={1.8} />
            Voltar para Home
          </Link>
        </div>

        <section className="services-page-header">
          <span className="services-page-eyebrow">
            <Heart size={14} strokeWidth={1.8} />
            Nossos procedimentos
          </span>

          <h1>Escolha o procedimento ideal para você</h1>

          <p>
            Seu próximo cuidado começa aqui. Conheça todos os procedimentos
            e encontre aquele que mais combina com você.
          </p>
        </section>

        <section className="services-benefits">
          <div className="services-benefit">
            <div className="services-benefit-icon">
              <Heart size={35} strokeWidth={1.5} fill="none" />
            </div>

            <div>
              <strong>Atendimento personalizado</strong>
              <p>Cuidado pensado para cada cliente.</p>
            </div>
          </div>

          <div className="services-benefit">
            <div className="services-benefit-icon">
              <Sparkles size={35} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Resultados naturais</strong>
              <p>Procedimentos que valorizam sua beleza.</p>
            </div>
          </div>

          <div className="services-benefit">
            <div className="services-benefit-icon">
              <ShieldCheck size={35} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Procedimentos com cuidado</strong>
              <p>Técnica, atenção e segurança em cada etapa.</p>
            </div>
          </div>

          <div className="services-benefit">
            <div className="services-benefit-icon">
              <CalendarDays size={35} strokeWidth={1.5} />
            </div>

            <div>
              <strong>Agendamento online</strong>
              <p>Escolha o melhor dia e horário para você.</p>
            </div>
          </div>
        </section>

        <div className="services-filters">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={selectedCategory === category ? "active" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              <span>{category}</span>

              <span className="filter-count">
                {getCategoryCount(category)}
              </span>
            </button>
          ))}
        </div>

        <section className="services-grid">
          {filteredServices.map((service) => {
            const promotion = promotions.find((item) => item.applies_to_all_services || item.service_ids?.map(String).includes(String(service.dbId)));
            const promotional = promotion ? calculatePromotion(service.priceValue, promotion) : null;
            return (
              <article className="service-card" key={service.slug}>
                <div className="service-card-content">
                  <span className="service-category">
                    {service.category}
                  </span>
                  {promotion && <span className="service-promotion-badge">Promoção</span>}

                  <h2>{service.title}</h2>

                  <p className="service-card-description">
                    {service.description}
                  </p>

                  <div className="service-card-footer">
                    <div className="service-main-info">
                      <span className="service-duration">
                        <span className="service-clock">◷</span>
                        {service.duration}
                      </span>

                      <strong className={promotion ? "service-price-old" : ""}>{service.price}</strong>
                      {promotion && <strong className="service-price-promotion">{promotional.final.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong>}
                    </div>
                    {promotion && <p className="service-promotion-validity">{promotion.title}{promotion.ends_at ? ` · até ${new Date(promotion.ends_at).toLocaleDateString("pt-BR")}` : ""}</p>}

                    <div className="service-reservation">
                      <span>
                        Taxa de reserva:{" "}
                        <strong>{service.reservationFee}</strong>
                      </span>

                      <small>
                        A taxa será abatida do valor final do procedimento.
                      </small>
                    </div>

                    <Link
                      className="service-card-button"
                      to={`/servicos/${service.slug}`}
                    >
                      <span>Conhecer procedimento</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </Layout>
  );
}

export default Services;
