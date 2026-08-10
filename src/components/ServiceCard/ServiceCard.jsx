import "./ServiceCard.css";

import { Link } from "react-router-dom";

function ServiceCard({
  slug,
  title,
  category,
  description,
  duration,
  price,
}) {
  return (
    <article className="service-card">
      <div className="service-card__content">
        <span className="service-card__category">
          {category}
        </span>

        <h3>{title}</h3>

        <p className="service-card__description">
          {description}
        </p>

        <span className="service-card__duration">
          {duration}
        </span>

        <strong className="service-card__price">
          {price}
        </strong>

        <Link
          to={`/servicos/${slug}`}
          className="service-card__button service-button"
        >
          Conhecer serviço
        </Link>
      </div>
    </article>
  );
}

export default ServiceCard;
