import "./CertificateGallery.css";

function CertificateGallery({ certificates }) {
  return (
    <div className="certificate-grid">
      {certificates.map((certificate) => (
        <article className="certificate-card" key={certificate.name}>
          <div className="certificate-card__image">
            <img src={certificate.image} alt={certificate.name} loading="lazy" decoding="async" />
            <span className="certificate-card__year">{certificate.year}</span>
          </div>

          <div className="certificate-card__content">
            <span>{certificate.category}</span>
            <h3>{certificate.name}</h3>
          </div>
        </article>
      ))}
    </div>
  );
}

export default CertificateGallery;
