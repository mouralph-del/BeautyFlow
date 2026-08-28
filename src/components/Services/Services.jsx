import "./Services.css";

import ServiceCard from "../ServiceCard/ServiceCard";
import useServiceCatalog from "../../hooks/useServiceCatalog";
import thaisServicesCover from "../../assets/images/thais-servicos-capa.jpeg";
import thaisServicesTrajectory from "../../assets/images/thais-servicos-trajetoria.jpeg";

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

      <div className="home-services-showcase" aria-label="Thaís Santos Beauty Studio">
        <figure className="home-services-photo home-services-photo--cover">
          <img
            src={thaisServicesCover}
            alt="Thaís Santos em retrato profissional"
            loading="lazy"
          />
        </figure>

        <figure className="home-services-photo home-services-photo--trajectory">
          <img
            src={thaisServicesTrajectory}
            alt="Thaís Santos no estúdio"
            loading="lazy"
          />
        </figure>
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
