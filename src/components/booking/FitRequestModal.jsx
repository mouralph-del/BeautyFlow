import "./BookingRequestModal.css";
import Modal from "../Modal/Modal";

export default function FitRequestModal({ isOpen, services, duration, selectedDate, onClose, onConfirm, isSubmitting }) {
  return (
    <Modal isOpen={Boolean(isOpen)} onClose={onClose} title="Solicitação de encaixe" describedBy="fit-request-desc">
      <form className="request-modal" onSubmit={(event) => { event.preventDefault(); onConfirm(Object.fromEntries(new FormData(event.currentTarget))); }}>
        <p id="fit-request-desc">Não encontrou um horário? Envie sua preferência para análise da profissional.</p>
        <dl className="request-modal-summary">
          <div><dt>Serviço</dt><dd>{services}</dd></div>
          <div><dt>Duração</dt><dd>{duration} minutos</dd></div>
          <div><dt>Data desejada</dt><dd>{selectedDate?.toLocaleDateString("pt-BR")}</dd></div>
        </dl>
        <fieldset className="request-modal-period">
          <legend>Período preferido</legend>
          <label><input required type="radio" name="preferredPeriod" value="manha" /> Manhã</label>
          <label><input required type="radio" name="preferredPeriod" value="tarde" /> Tarde</label>
          <label><input required type="radio" name="preferredPeriod" value="qualquer" /> Qualquer horário</label>
        </fieldset>
        <label className="request-modal-field">Horário específico (opcional)<input type="time" name="specificTime" /></label>
        <label className="request-modal-field">Observações (opcional)<textarea name="requestNotes" maxLength="500" rows="3" placeholder="Consigo chegar somente depois das 15h." /></label>
        <p className="request-modal-notice">O pedido ficará aguardando análise e não reservará um horário automaticamente.</p>
        <div className="request-modal-actions">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="request-cancel-button">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="request-confirm-button">Continuar solicitação</button>
        </div>
      </form>
    </Modal>
  );
}
