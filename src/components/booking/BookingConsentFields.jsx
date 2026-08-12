function BookingConsentFields({
  imageAuthorization,
  reservationPolicyAccepted,
  reservationPolicyAnswered,
  reservationPolicySelected,
  imagePolicy,
  reservationPolicy,
  imageError,
  reservationError,
  onImageChange,
  onReservationChange,
}) {
  return (
    <>
      <div className="image-authorization">
        <div className="image-authorization__heading">
          <h3>Autorização de uso de imagem</h3>

          <span>Obrigatório</span>
        </div>

        <p className="image-authorization__description">{imagePolicy}</p>

        <label
          className={`image-authorization__option ${
            imageAuthorization === "yes" ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="imageAuthorization"
            value="yes"
            checked={imageAuthorization === "yes"}
            onChange={onImageChange}
          />

          <div>
            <strong>Sim, autorizo</strong>

            <span>
              Autorizo o uso de fotos ou vídeos do resultado do procedimento para
              divulgação.
            </span>
          </div>
        </label>

        <label
          className={`image-authorization__option ${
            imageAuthorization === "no" ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="imageAuthorization"
            value="no"
            checked={imageAuthorization === "no"}
            onChange={onImageChange}
          />

          <div>
            <strong>Não autorizo</strong>

            <span>
              Não autorizo a divulgação de fotos ou vídeos do meu procedimento.
            </span>
          </div>
        </label>

        {imageError && <p className="form-error">{imageError}</p>}
      </div>

      <div className="image-authorization">
        <div className="image-authorization__heading">
          <h3>Confirmação da política de reserva</h3>

          <span>Obrigatório</span>
        </div>

        <p className="image-authorization__description">{reservationPolicy}</p>

        <label
          className={`image-authorization__option ${
            reservationPolicySelected ? "selected" : ""
          }`}
        >
          <input
            type="radio"
            name="reservationPolicyAccepted"
            checked={reservationPolicyAnswered && reservationPolicyAccepted}
            onChange={onReservationChange}
          />

          <div>
            <strong>
              Sim, estou ciente e concordo com a política de reserva.
            </strong>
          </div>
        </label>

        {reservationError && (
          <p className="form-error">{reservationError}</p>
        )}
      </div>
    </>
  );
}

export default BookingConsentFields;
