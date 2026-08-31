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
        <svg
          className="hero-photo__shape"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby="hero-photo-title"
        >
          <title id="hero-photo-title">Thaís Santos em retrato profissional</title>
          <defs>
            <clipPath id="heroPhotoClip" clipPathUnits="userSpaceOnUse">
              <path d="M 270 0 C 185 180 205 420 145 620 C 92 800 38 930 0 1000 L 1000 1000 L 1000 0 Z" />
            </clipPath>
          </defs>

          <path
            className="hero-photo__accent"
            d="M 232 0 C 145 180 160 420 100 620 C 50 800 8 930 -24 1000 L 28 1000 C 68 930 122 800 174 620 C 235 420 218 180 302 0 Z"
          />

          <foreignObject
            width="1000"
            height="1000"
            clipPath="url(#heroPhotoClip)"
          >
            <img
              className="hero-photo__image"
              src={thaisHeroPhoto}
              alt=""
            />
          </foreignObject>
        </svg>
      </figure>

    </section>
  );
}

export default Hero;
