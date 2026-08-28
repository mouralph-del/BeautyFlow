import CertificateGallery from "../components/Certificates/CertificateGallery";
import colorimetryCertificate from "../assets/certificates/colorimetria-sobrancelhas-2020.jpeg";
import masterclassCertificate from "../assets/certificates/masterclass-micropigmentacao-2020.jpeg";
import microbladingCertificate from "../assets/certificates/microblading-fio-a-fio-2023.jpeg";
import perfectClassicCertificate from "../assets/certificates/perfect-classic-2d-2026.jpeg";
import thaisStoryPhoto from "../assets/images/thais-minha-historia.jpeg";
import Layout from "../layouts/Layout";
import "./MyStory.css";

const journeyCards = [
  {
    title: "O Começo",
    text: "Tudo começou com o desejo de transformar cuidado em confiança e de valorizar a beleza presente em cada detalhe.",
  },
  {
    title: "A Evolução",
    text: "Cada curso, atendimento e desafio trouxe novas técnicas e uma forma ainda mais atenta de cuidar.",
  },
  {
    title: "A Dedicação",
    text: "A busca por conhecimento se tornou parte da rotina, sempre com respeito à individualidade de cada cliente.",
  },
  {
    title: "Atualmente",
    text: "Hoje, cada procedimento reúne técnica, delicadeza e uma experiência acolhedora do início ao fim.",
  },
  {
    title: "O Futuro",
    text: "Continuar evoluindo, criando novas experiências e fazendo cada cliente se sentir ainda mais especial.",
  },
];

const timeline = [
  { year: "2020", text: "O início da jornada e as primeiras formações." },
  { year: "2023", text: "Novas especializações e evolução profissional." },
  { year: "2026", text: "Uma nova fase de técnica, propósito e cuidado." },
];

const certificates = [
  {
    year: "2020",
    category: "Curso",
    name: "Colorimetria de Sobrancelhas",
    image: colorimetryCertificate,
  },
  {
    year: "2020",
    category: "Master Class",
    name: "Master Class de Micropigmentação Fio a Fio e Shadow",
    image: masterclassCertificate,
  },
  {
    year: "2023",
    category: "Especialização",
    name: "Microblading Fio a Fio",
    image: microbladingCertificate,
  },
  {
    year: "2026",
    category: "Especialização",
    name: "Perfect Classic +2D",
    image: perfectClassicCertificate,
  },
];

function MyStory() {
  return (
    <Layout>
      <main className="story-page">
        <section className="story-hero">
          <div className="story-portrait">
            <span aria-hidden="true" />
            <img
              src={thaisStoryPhoto}
              alt="Thaís Santos sentada no estúdio"
            />
          </div>

          <div className="story-introduction">
            <span>Minha jornada</span>
            <h1>Uma paixão que se tornou <span>propósito.</span></h1>
            <blockquote>
              “Acredito que a verdadeira beleza está nos detalhes e no cuidado
              com cada cliente.”
            </blockquote>
            <strong>Thaís Santos</strong>
          </div>
        </section>

        <section className="journey-grid" aria-label="Etapas da jornada">
          {journeyCards.map((card, index) => (
            <article key={card.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </article>
          ))}
        </section>

        <section className="story-timeline">
          <div className="story-section-heading">
            <h2>Minha evolução profissional</h2>
            <p>
              Cada etapa representa um marco, uma conquista e um novo
              aprendizado para oferecer sempre o melhor.
            </p>
          </div>

          <div className="timeline-track">
            {timeline.map((milestone) => (
              <article key={milestone.year}>
                <span />
                <strong>{milestone.year}</strong>
                <p>{milestone.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="story-certificates">
          <div className="story-section-heading">
            <h2>Conquistas que marcaram minha trajetória</h2>
            <p>
              Cada certificado representa um novo passo na busca por oferecer
              um atendimento cada vez melhor.
            </p>
          </div>

          <CertificateGallery certificates={certificates} />

        </section>

        <section className="story-philosophy">
          <span>Nossa essência</span>
          <h2>Nossa Filosofia</h2>
          <p>
            Acredito que a verdadeira beleza está nos detalhes e no cuidado
            com cada cliente.
          </p>
          <p>
            Cada procedimento é realizado com técnica, dedicação e atenção,
            proporcionando uma experiência acolhedora e pensada para valorizar
            aquilo que você já tem de mais bonito: a sua essência.
          </p>
          <strong>
            Cada detalhe revela uma versão ainda mais bonita de você.
          </strong>
        </section>
      </main>

    </Layout>
  );
}

export default MyStory;
