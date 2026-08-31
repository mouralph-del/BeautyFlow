import "./Hero.css";
import { useNavigate } from "react-router-dom";
import usePublicSettings from "../../hooks/usePublicSettings";
import thaisHeroPhoto from "../../assets/images/thais-servicos-capa.jpeg";

function Hero() {
  const navigate = useNavigate();
  const { studio } = usePublicSettings();
  const site = studio.site;
  const useEditorialTitle =
    site.home_title === "Um momento especial come\u00e7a aqui";

  return (
    <section className="home-hero">
      <div className="hero-content">
        <span className="hero-eyebrow">
          SOBRANCELHAS • CÍLIOS • CUIDADOS FACIAIS
        </span>

        <h1 aria-label={site.home_title}>
          {useEditorialTitle ? (
            <>
              <span aria-hidden="true" className="hero-title-line">
                Um momento
              </span>
              <span aria-hidden="true" className="hero-title-line">
                especial come&ccedil;a aqui
              </span>
            </>
          ) : (
            site.home_title
          )}
        </h1>

        <p className="hero-description">
          Procedimentos realizados com técnica, delicadeza e atenção a cada
          detalhe para proporcionar resultados que combinam com você.
        </p>

      </div>

      <figure className="hero-dark-panel" aria-hidden="true">
        <svg
          className="hero-photo__shape"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby="hero-photo-title"
        >
          <title id="hero-photo-title">Thaís Santos em retrato profissional</title>
          <defs>
            <radialGradient id="heroDarkPanel" cx="74%" cy="45%" r="82%">
              <stop offset="0%" stopColor="#232122" />
              <stop offset="42%" stopColor="#261d1b" />
              <stop offset="75%" stopColor="#211816" />
              <stop offset="100%" stopColor="#181211" />
            </radialGradient>
          </defs>

          <path
            className="hero-photo__accent"
            d="M 608 0 C 563 210 523 440 488 650 C 458 800 428 920 403 1000 L 415 1000 C 440 920 470 800 500 650 C 535 440 575 210 620 0 Z"
          />

          <path
            d="M 620 0 C 575 210 535 440 500 650 C 470 800 440 920 415 1000 L 1000 1000 L 1000 0 Z"
            fill="url(#heroDarkPanel)"
          />
        </svg>
      </figure>

      <figure className="hero-photo" aria-label="Thaís Santos em retrato profissional">
        <img className="hero-photo__image" src={thaisHeroPhoto} alt="" />
      </figure>

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

    </section>
  );
}

export default Hero;
