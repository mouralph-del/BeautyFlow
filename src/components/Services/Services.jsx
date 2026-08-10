import "./Services.css";

import ServiceCard from "../ServiceCard/ServiceCard";
import useServiceCatalog from "../../hooks/useServiceCatalog";

function Services() {
  const services = useServiceCatalog();
  return (
    <section className="services home-services">
      <div className="home-services-heading">
        <h2>Os favoritos das nossas clientes.</h2>

        <p>
          Procedimentos pensados para realçar sua beleza com cuidado e
          naturalidade.
        </p>
      </div>

      <div className="services__grid">
        {services
          .filter((service) => service.featured && service.active)
          .slice(0, 3)
          .map((service) => (
            <ServiceCard
              key={service.id}
              slug={service.slug}
              title={service.title}
              category={service.category}
              description={service.description}
              duration={service.duration}
              price={service.price}
            />
          ))}
      </div>
    </section>
  );
}

export default Services;
