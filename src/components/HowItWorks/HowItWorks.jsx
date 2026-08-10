import "./HowItWorks.css";

function HowItWorks({ steps }) {
  return (
    <section className="service-details__how">
      <h2>✨ Como funciona</h2>

      <p className="service-details__subtitle">
        Entenda cada etapa do procedimento antes do seu atendimento.
      </p>

      <div className="service-details__steps">
        {steps.map((step, index) => (
          <article className="step" key={`${step.title}-${index}`}>
            <div className="step-number">
              {index + 1}
            </div>

            <h3>{step.title}</h3>

            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
