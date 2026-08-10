import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { respondToFitProposal } from "../../services/bookingRequests";
import "./FitRequests.css";

const labels = {
  pendente: "Aguardando análise",
  pending_review: "Aguardando nova análise",
  aguardando_resposta_cliente: "Horário sugerido",
  aguardando_comprovante: "Aguardando comprovante",
  aguardando_aprovacao: "Pagamento em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  proposta_recusada: "Proposta recusada",
  expirado: "Expirado",
};
const date = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export default function FitRequests({ requests, onChanged }) {
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!requests?.length) return null;

  const respond = async (request, accepted) => {
    setLoading(true); setError("");
    try {
      const result = await respondToFitProposal(request.id, accepted, reason);
      if (accepted) {
        navigate(`/agendamento/${request.service_id}`, { state: { fitPayment: {
          requestId: request.id,
          appointmentDate: request.proposed_date,
          appointmentTime: request.proposed_time?.slice(0, 5),
          totalDuration: request.total_duration_minutes || request.duration_minutes,
          totalPrice: Number(request.total_price || 0),
          reservationAmount: Number(request.reservation_amount || 0),
          remainingAmount: Number(request.remaining_amount || 0),
          appointmentId: result.appointment_id,
          servicesData: request.services_data,
        } } });
        return;
      }
      setRejecting(null); setReason(""); await onChanged();
    } catch {
      setError("Não foi possível responder à proposta agora. Tente novamente em instantes.");
      await onChanged();
    } finally { setLoading(false); }
  };

  return (
    <section className="customer-fit-requests" id="encaixes">
      <span>Encaixes</span><h2>Solicitações de encaixe</h2>
      <div className="customer-fit-requests__list">
        {requests.map((request) => <article key={request.id}>
          <header><strong>{request.service_name}</strong><em>{labels[request.status] || request.status}</em></header>
          <p>Data desejada: {date(request.appointment_date)} · {request.preferred_period === "manha" ? "Manhã" : request.preferred_period === "tarde" ? "Tarde" : "Qualquer horário"}</p>
          {request.proposed_date && <p><strong>Horário sugerido:</strong> {date(request.proposed_date)} às {request.proposed_time?.slice(0,5)}</p>}
          {request.admin_message && <p>{request.admin_message}</p>}
          {request.proposal_expires_at && request.status === "aguardando_resposta_cliente" && <small>Proposta válida até {new Date(request.proposal_expires_at).toLocaleString("pt-BR")}</small>}
          {request.status === "aguardando_resposta_cliente" && <div className="customer-fit-requests__actions">
            <button disabled={loading} onClick={() => respond(request, true)}>Aceitar horário</button>
            <button className="secondary" disabled={loading} onClick={() => setRejecting(request.id)}>Recusar</button>
          </div>}
          {rejecting === request.id && <div className="customer-fit-requests__reject"><label>Motivo (opcional)<textarea maxLength="500" rows="2" value={reason} onChange={(event) => setReason(event.target.value)} /></label><button disabled={loading} onClick={() => respond(request, false)}>Confirmar recusa</button></div>}
        </article>)}
      </div>
      {error && <p className="customer-fit-requests__error">{error}</p>}
    </section>
  );
}
