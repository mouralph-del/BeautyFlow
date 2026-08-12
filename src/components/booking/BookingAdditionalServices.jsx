function BookingAdditionalServices({
  open,
  services,
  formatDuration,
  onSelect,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <section className="additional-services">
      <div className="additional-services__header">
        <h3>Adicionar outro serviço</h3>

        <button type="button" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div className="additional-services__grid">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            className="additional-service-card"
            onClick={() => onSelect(service)}
          >
            <strong>{service.title}</strong>
            <span>{formatDuration(service.durationMinutes)}</span>
            <span>{service.price}</span>
            <small>Reserva: {service.reservationFee}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default BookingAdditionalServices;
