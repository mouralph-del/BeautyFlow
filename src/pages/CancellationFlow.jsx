import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import Layout from "../layouts/Layout";
import { formatErrorMessage } from "../components/Error/errorMapper";
import usePublicSettings from "../hooks/usePublicSettings";
import Modal from "../components/Modal/Modal";
import {
  cancelAppointment,
  getCancellationDetails,
} from "../services/cancellations";
import "./CancellationFlow.css";

function CancellationFlow() {
  const { studio, policies } = usePublicSettings();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [appointment, setAppointment] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    getCancellationDetails({ appointmentId: id, token })
      .then((details) => {
        setAppointment(details);
        setCompleted(details.alreadyCancelled);
      })
      .catch((requestError) => setError(formatErrorMessage(requestError) || "Não foi possível carregar os detalhes do agendamento."))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleConfirmCancellation = async () => {
    if (!acknowledged) {
      setError(
        "Confirme que está ciente de que a taxa de reserva não será reembolsada."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await cancelAppointment({ appointmentId: id, token });
      setModalOpen(false);
      setCompleted(true);
    } catch (requestError) {
      setError(formatErrorMessage(requestError) || "Não foi possível cancelar o agendamento.");
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <main className="cancellation-page" aria-busy="true">
          <section className="cancellation-card">
            <p>Carregando agendamento...</p>
          </section>
        </main>
      </Layout>
    );
  }

  if (completed) {
    return (
      <Layout>
        <main className="cancellation-page">
          <section className="cancellation-card cancellation-success">
            <span className="cancellation-success__icon" aria-hidden="true">
              ✓
            </span>
            <h1>Cancelamento concluído</h1>
            <p>Seu agendamento foi cancelado com sucesso.</p>
            <p>O horário já foi liberado automaticamente em nossa agenda.</p>
            <p>Agradecemos por nos avisar.</p>
            <p>Esperamos receber você novamente em breve.</p>

            <div className="cancellation-success__actions">
              <Link to="/servicos">Agendar novo horário</Link>
              <Link to="/" className="secondary">
                Voltar para Home
              </Link>
            </div>
          </section>
        </main>
      </Layout>
    );
  }

  const cancellationBlocked = appointment && !appointment.canCancel;

  return (
    <Layout>
      <main className="cancellation-page">
        <section className="cancellation-card">
          <span className="cancellation-eyebrow">AGENDAMENTO #{id}</span>
          <h1>Cancelar agendamento</h1>

          {error && <p className="cancellation-error">{error}</p>}

          {appointment && (
            <dl className="cancellation-summary">
              <div>
                <dt>Serviço</dt>
                <dd>{appointment.serviceName}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>
                  {new Date(
                    `${appointment.date}T12:00:00`
                  ).toLocaleDateString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt>Horário</dt>
                <dd>{appointment.time}</dd>
              </div>
              <div>
                <dt>Taxa de reserva</dt>
                <dd>
                  {Number(appointment.reservationAmount).toLocaleString(
                    "pt-BR",
                    { style: "currency", currency: "BRL" }
                  )}
                </dd>
              </div>
            </dl>
          )}

          {cancellationBlocked ? (
            <div className="cancellation-blocked">
              <strong>
                Este atendimento não pode mais ser cancelado pelo site.
              </strong>
              <p>Entre em contato com o estúdio através do Instagram.</p>
              <a
                href={studio.instagram}
                target="_blank"
                rel="noreferrer"
              >
                Abrir Instagram
              </a>
            </div>
          ) : (
            <>
              <div className="cancellation-warning">
                <p>Você está prestes a cancelar este agendamento.</p>
                <p>
                  Após a confirmação, seu horário será liberado
                  automaticamente para outra cliente.
                </p>
                <p>
                  {policies.cancellation?.content || "A taxa de reserva não será reembolsada conforme a política do estúdio."}
                </p>
              </div>

              <label className="cancellation-acknowledgement">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) =>
                    setAcknowledged(event.target.checked)
                  }
                />
                <span>
                  Estou ciente de que a taxa de reserva não será reembolsada.
                </span>
              </label>

              <button
                type="button"
                className="cancellation-submit"
                disabled={!acknowledged}
                onClick={() => setModalOpen(true)}
              >
                Cancelar agendamento
              </button>
            </>
          )}
        </section>

        {modalOpen && (
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar cancelamento" describedBy="cancellation-modal-desc" closeOnOverlayClick={false}>
            <p id="cancellation-modal-desc">Tem certeza de que deseja cancelar este agendamento?</p>
            <ul>
              <li>O horário será liberado automaticamente.</li>
              <li>O cancelamento será definitivo.</li>
              <li>A taxa de reserva não será reembolsada.</li>
            </ul>

            <div className="cancellation-modal__actions">
              <button type="button" className="secondary" disabled={submitting} onClick={() => setModalOpen(false)}>Voltar</button>
              <button type="button" disabled={submitting} onClick={handleConfirmCancellation}>{submitting ? "Cancelando..." : "Confirmar cancelamento"}</button>
            </div>
          </Modal>
        )}
      </main>
    </Layout>
  );
}

export default CancellationFlow;
