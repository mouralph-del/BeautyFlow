import "./BookingRequestModal.css";
import Modal from "../Modal/Modal";

function BookingRequestModal({ isOpen, selectedTime, onClose, onConfirm, isSubmitting }) {
  return (
    <Modal isOpen={Boolean(isOpen)} onClose={onClose} title="Solicitação de encaixe" describedBy="booking-request-desc" closeOnOverlayClick={false}>
      <div className="request-modal">
        <p id="booking-request-desc">
          O horário de <strong>{selectedTime}</strong> ultrapassa
          ligeiramente o horário normal de atendimento.
        </p>

        <p>
          Você pode enviar uma solicitação para que a profissional
          avalie a possibilidade desse encaixe.
        </p>

        <p>
          Você será avisada por e-mail quando a solicitação for
          aprovada ou recusada.
        </p>

        <div className="request-modal-actions">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="request-cancel-button">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting} className="request-confirm-button">{isSubmitting ? "Enviando..." : "Continuar solicitação"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default BookingRequestModal;
