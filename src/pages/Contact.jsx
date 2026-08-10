import { useState } from "react";
import { Check, Clock3, Copy, Mail, MapPin } from "lucide-react";

import { InstagramIcon } from "../components/BeautyIcons/BeautyIcons";
import Layout from "../layouts/Layout";
import usePublicSettings from "../hooks/usePublicSettings";
import "./Contact.css";

const openingHours = [
  ["Segunda a quarta", "08h às 12h e 13h30 às 18h"],
  ["Quinta", "Fechado"],
  ["Sexta", "08h às 12h e 13h30 às 18h"],
  ["Sábado", "08h às 12h e 13h às 15h"],
  ["Domingo", "Fechado"],
];

function Contact() {
  const { studio } = usePublicSettings();
  const [emailCopied, setEmailCopied] = useState(false);
  const instagramUrl = studio.instagram;
  const contactEmail = studio.contact_email?.trim() || "";
  const location = `${studio.neighborhood} — ${studio.city}/${studio.state}`;
  const copyEmail = async () => {
    if (!contactEmail) return;
    await navigator.clipboard.writeText(contactEmail);
    setEmailCopied(true);
    window.setTimeout(() => setEmailCopied(false), 2500);
  };

  return (
    <Layout>
      <div className="contact-page" data-location={location}>
        <section className="contact-hero">
          <span>Um momento especial começa aqui</span>
          <h1>Um atendimento preparado com carinho espera por você. 🤎</h1>
          <p>
            Entre em contato pelo Instagram para tirar dúvidas ou acompanhe meu
            trabalho por lá.
          </p>
          <a href={instagramUrl} target="_blank" rel="noreferrer">
            <InstagramIcon size={19} />
            Falar pelo Instagram
          </a>
        </section>

        <section className="contact-cards" aria-label="Informações de contato">
          <article>
            <span className="contact-card__icon">
              <Mail size={24} strokeWidth={1.7} />
            </span>
            <h2>E-mail</h2>
            <p>
              Para dúvidas sobre agendamentos ou informações do atendimento,
              entre em contato por e-mail.
            </p>
            <strong>{contactEmail || "Entre em contato pelo Instagram enquanto nosso e-mail não está disponível."}</strong>
            {contactEmail && (
              <div className="contact-card__actions">
                <a href={`mailto:${contactEmail}`}>Enviar e-mail</a>
                <button type="button" onClick={copyEmail} aria-live="polite">
                  {emailCopied ? <Check size={17} /> : <Copy size={17} />}
                  {emailCopied ? "E-mail copiado" : "Copiar endereço"}
                </button>
              </div>
            )}
          </article>

          <article>
            <span className="contact-card__icon">
              <MapPin size={24} strokeWidth={1.7} />
            </span>
            <h2>Localização</h2>
            <strong>{location}</strong>
            <p>
              Por segurança e privacidade, o endereço completo é enviado após a
              confirmação do agendamento.
            </p>
          </article>
        </section>

        <section className="contact-map" aria-labelledby="contact-map-title">
          <div>
            <span>Região de atendimento</span>
            <h2 id="contact-map-title">{location}</h2>
          </div>
          <iframe
            title="Mapa aproximado da região de São João Clímaco"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-46.6300%2C-23.6600%2C-46.5500%2C-23.5800&amp;layer=mapnik&amp;marker=-23.6234%2C-46.5908"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </section>

        <section className="contact-hours">
          <div className="contact-hours__heading">
            <span>
              <Clock3 size={22} strokeWidth={1.7} />
            </span>
            <h2>Horários de atendimento</h2>
          </div>

          <dl>
            {openingHours.map(([day, hours]) => (
              <div key={day}>
                <dt>{day}</dt>
                <dd>{hours}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="contact-farewell">Nos encontramos em breve. 🤎</p>
      </div>
    </Layout>
  );
}

export default Contact;
