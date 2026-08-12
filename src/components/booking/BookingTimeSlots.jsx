function BookingTimeSlots({
  slots,
  selectedTime,
  disabled,
  onSelect,
  onRequestFit,
  onClick,
}) {
  return (
    <section className="booking__times">
      <h2>⏰ Horários disponíveis</h2>

      {slots.length > 0 ? (
        <div className="booking__times-grid">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              className={`time-slot booking__time time-slot--${slot.status} ${
                selectedTime === slot.time
                  ? "selected booking__time--selected"
                  : ""
              }`}
              disabled={slot.status === "unavailable"}
              onClick={() => onSelect(slot)}
            >
              <span>{slot.time}</span>

              {slot.status === "unavailable" && <small>Indisponível</small>}

              {slot.status === "approval" && (
                <small>Solicitar encaixe</small>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p className="booking__no-times">
            Não há horários disponíveis para esta data. Escolha outro dia.
          </p>
          <button
            type="button"
            className="booking__fit-request"
            onClick={onRequestFit}
          >
            Solicitar encaixe
          </button>
        </div>
      )}

      {slots.length > 0 && (
        <button
          type="button"
          className="booking__fit-link"
          onClick={onRequestFit}
        >
          Não encontrei um horário
        </button>
      )}

      <button
        className="booking__continue"
        disabled={disabled}
        onClick={onClick}
      >
        Continuar
      </button>
    </section>
  );
}

export default BookingTimeSlots;
