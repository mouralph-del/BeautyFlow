import Hero from "../components/Hero/Hero";
import Services from "../components/Services/Services";
import Layout from "../layouts/Layout";
import "./Home.css";
import PromotionBanner from "../components/Promotions/PromotionBanner";
import usePromotions from "../hooks/usePromotions";

function Home() {
  const promotions = usePromotions("home");
  return (
    <Layout>
      <div className="home">
        <Hero />
        <PromotionBanner promotion={promotions[0]} />

        <section className="home-benefits">
          <div className="home-benefit">
            <span className="home-benefit-icon">♡</span>

            <div>
              <strong>Atendimento cuidadoso</strong>
              <p>Atenção aos detalhes em cada procedimento.</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon">⌂</span>

            <div>
              <strong>Ambiente acolhedor</strong>
              <p>Um momento preparado para você se sentir bem.</p>
            </div>
          </div>

          <div className="home-benefit">
            <span className="home-benefit-icon">▣</span>

            <div>
              <strong>Agendamento online</strong>
              <p>Escolha o serviço, a data e o horário com facilidade.</p>
            </div>
          </div>
        </section>

        <Services />
      </div>
    </Layout>
  );
}

export default Home;
