import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import ServiceHero from "../components/ServiceHero/ServiceHero";
import useServiceCatalog from "../hooks/useServiceCatalog";
import Layout from "../layouts/Layout";
import "./ServiceDetails.css";

function ServiceDetails() {
  const services = useServiceCatalog();
  const { slug } = useParams();
  const navigate = useNavigate();

  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return (
      <Layout>
        <main className="service-details service-details--not-found">
          <h1>Serviço não encontrado</h1>

          <p>
            O procedimento procurado não está disponível ou foi removido.
          </p>

          <Link to="/servicos" className="service-details__back">
            ← Voltar para Serviços
          </Link>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="service-details">
        <button
          type="button"
          className="service-details__back"
          onClick={() => navigate("/servicos")}
        >
          <ChevronLeft size={17} />
          Voltar aos serviços
        </button>

        <div className="service-details__container">
          <ServiceHero service={service} />
        </div>

        {service.howItWorks?.length > 0 && (
          <HowItWorks steps={service.howItWorks} />
        )}

        {service.benefits?.length > 0 && (
          <section className="service-details__benefits">
            <h2>🤎 Por que escolher este procedimento?</h2>

            <div className="benefits-grid">
              {service.benefits.map((benefit) => (
                <div className="benefit-card" key={benefit.title}>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(service.beforeCare?.length > 0 || service.afterCare?.length > 0) && (
          <section className="service-details__care">

            <h2>🤎 Cuidados importantes</h2>

            <div className="care-grid">

              {service.beforeCare?.length > 0 && (
                <article className="care-card">

                  <h3>Antes do procedimento</h3>

                  <ul>
                    {service.beforeCare.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                </article>
              )}

              {service.afterCare?.length > 0 && (
                <article className="care-card">

                  <h3>Depois do procedimento</h3>

                  <ul>
                    {service.afterCare.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                </article>
              )}

            </div>

          </section>
        )}

      </main>
    </Layout>
  );
}

export default ServiceDetails;
