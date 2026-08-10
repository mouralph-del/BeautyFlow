import logoSource from "../../assets/logo/logo-thais-transparent.png";
import usePublicSettings from "../../hooks/usePublicSettings";
import "./BrandLogo.css";

function BrandLogo({ className = "" }) {
  const { studio } = usePublicSettings();
  const logoProfessionalName = studio.professional_name
    .replaceAll("í", "i")
    .replaceAll("Í", "I");

  return (
    <span
      className={`brand-logo ${className}`}
      role="img"
      aria-label={studio.studio_name}
    >
      <span className="brand-logo__mark" aria-hidden="true">
        <img src={studio.logo_path || logoSource} alt="" />
      </span>
      <strong>{logoProfessionalName}</strong>
      <small>{studio.studio_name.replace(studio.professional_name, "").trim() || "Beauty Studio"}</small>
    </span>
  );
}

export default BrandLogo;
