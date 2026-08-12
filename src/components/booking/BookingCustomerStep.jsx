import BookingConsentFields from "./BookingConsentFields";
import BookingProfileConfirmation from "./BookingProfileConfirmation";

function BookingCustomerStep({
  customerData,
  errors,
  userEmail,
  readOnly,
  showProfileConfirmation,
  confirmingProfile,
  continueDisabled,
  reservationPolicyAnswered,
  reservationPolicySelected,
  imagePolicy,
  reservationPolicy,
  onCustomerChange,
  onContactBlur,
  onReservationChange,
  onEditProfile,
  onConfirmProfile,
  onClick,
  buttonText,
  onContinue,
}) {
  return (
    <section className="booking__customer">
      <h2>Seus dados</h2>

      {showProfileConfirmation && (
        <BookingProfileConfirmation
          customerData={customerData}
          email={userEmail}
          onEdit={onEditProfile}
          onConfirm={onConfirmProfile}
        />
      )}

      <label>
        Nome completo
        <input
          type="text"
          name="name"
          value={customerData.name}
          onChange={onCustomerChange}
          placeholder="Digite seu nome completo"
          required
        />
        {errors.name && <p className="form-error">{errors.name}</p>}
      </label>

      <label>
        WhatsApp
        <input
          type="tel"
          name="phone"
          value={customerData.phone}
          onChange={onCustomerChange}
          onBlur={onContactBlur}
          placeholder="(11) 99999-9999"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={15}
          required
        />

        {errors.phone && <p className="form-error">{errors.phone}</p>}
      </label>

      <label>
        E-mail
        <input
          type="email"
          name="email"
          value={customerData.email}
          onChange={onCustomerChange}
          onBlur={onContactBlur}
          placeholder="seuemail@exemplo.com"
          autoComplete="email"
          readOnly={readOnly}
          required
        />

        {errors.email && <p className="form-error">{errors.email}</p>}
      </label>
      {userEmail && <small>O e-mail é o mesmo da sua conta autenticada.</small>}
      {errors.profile && <p className="form-error">{errors.profile}</p>}

      <label>
        Observações — opcional
        <textarea
          name="notes"
          value={customerData.notes}
          onChange={onCustomerChange}
          placeholder="Existe alguma informação importante sobre o atendimento?"
          rows={5}
        />
      </label>

      <BookingConsentFields
        imageAuthorization={customerData.imageAuthorization}
        reservationPolicyAccepted={customerData.reservationPolicyAccepted}
        reservationPolicyAnswered={reservationPolicyAnswered}
        reservationPolicySelected={reservationPolicySelected}
        imagePolicy={imagePolicy}
        reservationPolicy={reservationPolicy}
        imageError={errors.imageAuthorization}
        reservationError={errors.reservationPolicy}
        onImageChange={onCustomerChange}
        onReservationChange={onReservationChange}
      />

      <div className="booking__actions">
        <button type="button" className="booking__back-button" onClick={onClick}>
          {buttonText}
        </button>

        <button
          type="button"
          className="booking__continue"
          disabled={continueDisabled}
          onClick={onContinue}
        >
          {confirmingProfile ? "Salvando dados..." : "Revisar agendamento"}
        </button>
      </div>
    </section>
  );
}

export default BookingCustomerStep;
