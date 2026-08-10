import { useNavigate } from "react-router-dom";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Tag,
  WalletCards,
} from "lucide-react";

import ServiceLocation from "../ServiceLocation/ServiceLocation";
import usePublicSettings from "../../hooks/usePublicSettings";
import "./ServiceHero.css";

function ServiceHero({ service }) {
  const navigate = useNavigate();
  const { studio } = usePublicSettings();

  return (
    <section className="service-hero" aria-label={`${service.title} — ${studio.studio_name}`}>
      <div className="service-hero__content">
          <span className="service-hero__category">
            {service.category}
          </span>

          <h1>{service.title}</h1>

          <div className="service-hero__rating">
            ⭐⭐⭐⭐⭐
            <span>4,9</span>
          </div>

          <p className="service-hero__description">
            {service.description}
          </p>

          <div className="service-hero__info">
            <div className="service-hero__info-card">
              <span className="service-hero__info-icon">
                <Clock3 size={19} strokeWidth={1.7} />
              </span>

              <div>
                <span>Duração</span>
                <strong>{service.duration}</strong>
              </div>
            </div>

            <div className="service-hero__info-card">
              <span className="service-hero__info-icon">
                <Tag size={19} strokeWidth={1.7} />
              </span>

              <div>
                <span>Valor</span>
                <strong>{service.price}</strong>
              </div>
            </div>

            <div className="service-hero__info-card">
              <span className="service-hero__info-icon">
                <WalletCards size={19} strokeWidth={1.7} />
              </span>

              <div>
                <span>Taxa de reserva</span>
                <strong>{service.reservationFee}</strong>
              </div>
            </div>
          </div>

          <div className="service-hero__booking-wrapper">
            <button
              type="button"
              className="service-hero__booking"
              onClick={() => navigate(`/agendamento/${service.id}`)}
            >
              <CalendarDays size={17} strokeWidth={1.8} />
              Agendar agora
            </button>
          </div>

          <div className="service-hero__highlights">
            <span>
              <CheckCircle2 size={16} strokeWidth={1.8} />
              Reserva online
            </span>

            <span>
              <CheckCircle2 size={16} strokeWidth={1.8} />
              Confirmação automática
            </span>

            <span>
              <CheckCircle2 size={16} strokeWidth={1.8} />
              Taxa abatida do valor final
            </span>
          </div>

          <div className="service-hero__important-information">
            <strong>Pagamento no dia do atendimento:</strong>

            <p>
              {`Aceitamos ${Object.entries(studio.payment_methods)
                .filter(([, enabled]) => enabled)
                .map(([method]) => ({ pix: "Pix", debit_card: "cartão de débito", credit_card: "cartão de crédito", cash: "dinheiro" })[method])
                .join(", ")}. ${studio.credit_card_notice}`}
            </p>
          </div>

          <ServiceLocation />
      </div>
    </section>
  );
}

export default ServiceHero;
