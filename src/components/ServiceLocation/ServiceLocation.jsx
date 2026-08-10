import "./ServiceLocation.css";
import usePublicSettings from "../../hooks/usePublicSettings";

function ServiceLocation() {
  const { studio, policies } = usePublicSettings();
  const location = `${studio.neighborhood} • ${studio.city}/${studio.state}`;
  return (
    <section className="service-location">
      <h3 className="service-location__title">
        <span aria-hidden="true">📍</span>
        Localização
      </h3>

      <p className="service-location__neighborhood">
        {location}
      </p>

      <a
        className="service-location__maps"
        href={studio.map_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span aria-hidden="true">🗺️</span>
        Ver região no Google Maps
      </a>

      <div className="service-location__notice">
        <span aria-hidden="true">🔒</span>

        <p>
          {policies.address_notice?.content || "O endereço completo será enviado por e-mail após a confirmação do pagamento da reserva."}
        </p>
      </div>

      <p className="service-location__privacy">
        Por questões de privacidade e segurança, o endereço completo é
        disponibilizado apenas para clientes com agendamento confirmado.
      </p>
    </section>
  );
}

export default ServiceLocation;
