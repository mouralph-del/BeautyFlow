function BookingFitSuccess({ onNavigate }) {
  return (
    <section className="booking__success">
      <h1>Solicitação enviada com sucesso!</h1>
      <p>Seu pedido de encaixe está aguardando análise da profissional.</p>
      <p>Você poderá acompanhar a resposta no Meu Espaço.</p>
      <button className="booking__continue" onClick={onNavigate}>
        Acessar Meu Espaço
      </button>
    </section>
  );
}

export default BookingFitSuccess;
