import "./Hero.css";
import { useNavigate } from "react-router-dom";
import usePublicSettings from "../../hooks/usePublicSettings";
import thaisHeroPhoto from "../../assets/images/thais-servicos-capa.jpeg";

function Hero() {
  const navigate = useNavigate();
  const { studio } = usePublicSettings();
  const site = studio.site;

  return (
    <section className="home-hero">
      <div className="hero-content">
        <span className="hero-eyebrow">
          SOBRANCELHAS • CÍLIOS • CUIDADOS FACIAIS
        </span>

        <h1>{site.home_title}</h1>

        <p className="hero-description">
          Procedimentos realizados com técnica, delicadeza e atenção a cada
          detalhe para proporcionar resultados que combinam com você.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="hero-primary-button"
            onClick={() => navigate("/servicos")}
          >
            {site.primary_button}
          </button>

          <button
            type="button"
            className="hero-secondary-button"
            onClick={() => navigate("/galeria")}
          >
            {site.gallery_button}
          </button>
        </div>
      </div>

      <figure className="hero-photo" aria-label="Thaís Santos Beauty Studio">
        <img
          src={thaisHeroPhoto}
          alt="Thaís Santos em retrato profissional"
        />
      </figure>

    </section>
  );
}

export default Hero;
