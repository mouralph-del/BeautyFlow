function BookingProfileConfirmation({ customerData, email, onEdit, onConfirm }) {
  return (
    <article className="customer-profile-confirmation">
      <h3>Confirme seus dados</h3>
      <p><strong>Nome:</strong> {customerData.name}</p>
      <p><strong>Telefone:</strong> {customerData.phone}</p>
      <p><strong>E-mail:</strong> {email}</p>
      <div><button type="button" onClick={onEdit}>Alterar dados</button><button type="button" className="primary" onClick={onConfirm}>Confirmar e continuar</button></div>
      <small>As autorizações e a política atual ainda serão confirmadas para este agendamento.</small>
    </article>
  );
}

export default BookingProfileConfirmation;
