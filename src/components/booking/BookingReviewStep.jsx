function BookingReviewStep({
  services,
  date,
  time,
  customerData,
  totalPrice,
  totalDeposit,
  remainingAmount,
  fitRequestError,
  bookingType,
  loading,
  onClick,
  buttonText,
  onContinue,
}) {
  return (
    <section className="booking-review">
      <h2 className="booking-section-title">📋 Revise seu agendamento</h2>

      <div className="review-card">
        <h3>Serviços selecionados</h3>

        <div className="review-services-list">
          {services.map((service) => (
            <div key={service.id}>
              <strong>{service.title}</strong>
              <span>
                {service.durationLabel}
                {" • "}
                {service.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="review-top-grid">
        <div className="review-card">
          <h3>Data e horário</h3>

          <div className="review-details">
            <div>
              <span>Data</span>
              <p>{date}</p>
            </div>

            <div>
              <span>Horário</span>
              <p>{time}</p>
            </div>
          </div>

          <div className="review-item">
            <span>📍 Localização</span>
            <strong>São João Clímaco • São Paulo/SP</strong>
          </div>
        </div>

        <div className="review-card">
          <h3>Seus dados</h3>

          <div className="review-customer">
            <p>{customerData.name}</p>
            <p>{customerData.phone}</p>
            <p>{customerData.email}</p>
          </div>

          {customerData.notes?.trim() && (
            <div className="review-observation">
              <span>Observações</span>
              <p>{customerData.notes}</p>
            </div>
          )}

          <div className="review-item">
            <span>Uso de imagem</span>
            <strong>
              {customerData.imageAuthorization === "yes"
                ? "Autorizado"
                : "Não autorizado"}
            </strong>
          </div>
        </div>
      </div>

      <div className="review-card review-payment">
        <h3>💰 Resumo do pagamento</h3>

        <div className="payment-row">
          <span>Valor do procedimento</span>
          <strong>{totalPrice}</strong>
        </div>

        <div className="payment-row">
          <span>Reserva paga hoje</span>
          <strong>{totalDeposit}</strong>
        </div>

        <div className="payment-divider" />

        <div className="payment-row payment-total">
          <span>Restante no atendimento</span>
          <strong>{remainingAmount}</strong>
        </div>

        <p className="payment-note">
          ✓ A reserva será descontada do valor total.
        </p>
      </div>

      <div className="review-info">
        <h3>ℹ️ Informações importantes</h3>

        <p>A taxa de reserva será abatida do valor total do procedimento.</p>

        <p>O valor restante será pago presencialmente no dia do atendimento.</p>

        <p>
          Após a confirmação do pagamento, seu horário será reservado
          automaticamente.
        </p>

        <p>
          Em caso de cancelamento, será aplicada a política de cancelamento do
          estúdio.
        </p>

        <div className="review-location-note">
          <span>🔒</span>

          <p>
            O endereço completo será enviado por e-mail após a aprovação do
            pagamento da reserva.
          </p>
        </div>
      </div>

      <div className="review-actions">
        {fitRequestError && (
          <p className="booking__form-error">{fitRequestError}</p>
        )}
        <button type="button" className="review-back-button" onClick={onClick}>
          {buttonText}
        </button>

        <button
          type="button"
          className="review-payment-button"
          disabled={loading}
          onClick={onContinue}
        >
          {bookingType === "request"
            ? loading
              ? "Enviando solicitação..."
              : "Enviar solicitação de encaixe"
            : "Continuar para pagamento"}
        </button>
      </div>
    </section>
  );
}

export default BookingReviewStep;
