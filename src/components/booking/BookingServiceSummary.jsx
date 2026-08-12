function BookingServiceSummary({ service }) {
  return (
    <div className="booking__service">
      <div className="booking__content">
        <span>{service.category}</span>

        <h2>{service.title}</h2>

        <p>{service.description}</p>

        <div className="booking__info">
          <p>⏱ {service.duration}</p>

          <p>💰 {service.price}</p>

          <p>📌 Reserva: {service.reservationFee}</p>
        </div>
      </div>
    </div>
  );
}

export default BookingServiceSummary;
