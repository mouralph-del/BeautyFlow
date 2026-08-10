function MonthlySummary({ summary }) {
  return (
    <section className="admin-section monthly-summary">
      <div className="admin-section__heading">
        <div>
          <span>DESEMPENHO</span>
          <h2>Resumo mensal</h2>
        </div>
      </div>

      <dl>
        <div>
          <dt>Serviço mais procurado</dt>
          <dd>{summary.mostRequestedService}</dd>
        </div>
        <div>
          <dt>Quantidade de agendamentos</dt>
          <dd>{summary.appointmentsCount}</dd>
        </div>
        <div>
          <dt>Taxa de comparecimento</dt>
          <dd>{summary.attendanceRate}</dd>
        </div>
        <div>
          <dt>Total recebido em reservas</dt>
          <dd>{summary.reservationRevenue}</dd>
        </div>
      </dl>
    </section>
  );
}

export default MonthlySummary;
