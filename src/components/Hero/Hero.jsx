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
              <path d="M 340 0 C 230 160 240 420 180 640 C 120 820 50 940 0 1000 L 1000 1000 L 1000 0 Z" />
            </clipPath>
          </defs>

          <path
            className="hero-photo__accent"
            d="M 280 0 C 170 160 185 420 125 640 C 70 820 20 940 -40 1000 L 80 1000 C 135 940 200 820 255 640 C 315 420 305 160 420 0 Z"
          />

          <image
            href={thaisHeroPhoto}
            width="1000"
            height="1000"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#heroPhotoClip)"
          />
        </svg>
      </figure>

    </section>
  );
}

export default Hero;
