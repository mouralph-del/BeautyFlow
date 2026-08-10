import { useNavigate } from "react-router-dom";
import BrandLogo from "../BrandLogo/BrandLogo";
import "./ApprovalPendingStep.css";

function ApprovalPendingStep() {
  const navigate = useNavigate();

  const handleBackHome = () => {
    navigate("/");
  };

  return (
    <section className="approval-pending-step">
      <h2>Solicitação enviada com sucesso!</h2>

      <p className="approval-subtitle">
        Recebemos seu comprovante de pagamento. Agora ele será analisado pela
        profissional.
      </p>

      <div className="approval-status-card">
        <span className="approval-status-label">
          Status do agendamento
        </span>

        <div className="approval-status">
          <span className="approval-status-dot" aria-hidden="true" />

          <strong>Aguardando aprovação</strong>
        </div>

        <p>
          Assim que o pagamento for aprovado, você receberá um e-mail com a
          confirmação e todas as informações do atendimento.
        </p>
      </div>

      <div className="approval-next-steps">
        <h3>O que acontece agora?</h3>

        <div className="approval-next-item">
          <span aria-hidden="true">✓</span>

          <p>A profissional irá analisar o comprovante enviado.</p>
        </div>

        <div className="approval-next-item">
          <span aria-hidden="true">✓</span>

          <p>
            Após a aprovação, seu agendamento será confirmado por e-mail.
          </p>
        </div>

        <div className="approval-email-info">
          <strong>O e-mail de confirmação terá:</strong>

          <ul>
            <li>Data e horário do atendimento</li>
            <li>Endereço completo</li>
            <li>Link para abrir no Google Maps</li>
            <li>Informações importantes para o atendimento</li>
          </ul>
        </div>
      </div>

      <div className="approval-thanks">
        <BrandLogo className="approval-thanks__logo" />

        <p>Obrigada por escolher!</p>

        <strong>Thaís Santos Beauty Studio</strong>

        <span>Será um prazer receber você. 🤎</span>
      </div>

      <button
        type="button"
        className="approval-home-button"
        onClick={handleBackHome}
      >
        Voltar para o início
      </button>
    </section>
  );
}

export default ApprovalPendingStep;
