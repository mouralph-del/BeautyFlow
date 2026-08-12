function BookingStepper({ step }) {
  return (
    <div className="booking__steps">
      <div
        className={`booking__step ${
          step >= 1 ? "booking__step--active" : ""
        }`}
      >
        <div className="booking__circle">{step > 1 ? "✓" : "1"}</div>

        <span>Escolha</span>
      </div>

      <div className="booking__line" />

      <div
        className={`booking__step ${
          step >= 2 ? "booking__step--active" : ""
        }`}
      >
        <div className="booking__circle">{step > 2 ? "✓" : "2"}</div>

        <span>Dados</span>
      </div>

      <div className="booking__line" />

      <div
        className={`booking__step ${
          step >= 3 ? "booking__step--active" : ""
        }`}
      >
        <div className="booking__circle">3</div>

        <span>Confirmação</span>
      </div>
    </div>
  );
}

export default BookingStepper;
