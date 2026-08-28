function BookingServiceSelection({
  services,
  duration,
  price,
  deposit,
  onRemove,
  onOpenAdditional,
  children,
}) {
  return (
    <section className="selected-services">
      <div className="selected-services__header">
        <div>
          <span>Seu atendimento</span>
          <strong>
            {services.length}{" "}
            {services.length === 1
              ? "serviço selecionado"
              : "serviços selecionados"}
          </strong>
        </div>

        <button
          type="button"
          className="add-service-button"
          onClick={onOpenAdditional}
        >
          + Adicionar outro serviço
        </button>
      </div>

      <div className="selected-services__list">
        {services.map((service) => (
          <div key={service.id} className="selected-service-item">
            <div>
              <strong>{service.title}</strong>

              <span>
                {service.durationLabel}
                {" • "}
                {service.price}
              </span>
            </div>

            {services.length > 1 && (
              <button type="button" onClick={() => onRemove(service.id)}>
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="selected-services__totals">
        <span>
          Duração total:
          <strong>{duration}</strong>
        </span>

        <span>
          Valor total:
          <strong>{price}</strong>
        </span>

        <span>
          Reserva:
          <strong>{deposit}</strong>
        </span>
      </div>

      {children}
    </section>
  );
}

export default BookingServiceSelection;
