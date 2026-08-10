const statusLabels = {
  confirmado: "Confirmado",
  aguardando_aprovacao: "Pagamento em análise",
  aguardando_pagamento: "Aguardando pagamento",
  cancelado: "Cancelado",
};

const formatMonth = (date) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

function AppointmentsTable({
  appointments,
  onViewDetails,
  referenceDate,
  onPreviousMonth,
  onNextMonth,
  filters = [],
  selectedFilter = "all",
  onFilterChange,
  loading = false,
}) {
  return (
    <section className="admin-section" id="agenda">
      <div className="admin-section__heading">
        <div>
          <span>AGENDA</span>
          <h2>Atendimentos do mês</h2>
        </div>
        <div className="appointments-month-navigation">
          <button type="button" onClick={onPreviousMonth} aria-label="Mês anterior">‹</button>
          <strong>{formatMonth(referenceDate)}</strong>
          <button type="button" onClick={onNextMonth} aria-label="Próximo mês">›</button>
        </div>
      </div>

      <div className="appointments-filters" aria-label="Filtrar atendimentos">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.value}
            className={selectedFilter === filter.value ? "active" : ""}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label} <span>{filter.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty">Carregando atendimentos...</p>
      ) : appointments.length === 0 ? (
        <p className="admin-empty">Nenhum atendimento encontrado neste mês.</p>
      ) : (
        <div className="appointments-table-wrapper">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>Serviço</th>
                <th>Duração</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{new Date(`${appointment.appointment_date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                  <td>{appointment.appointment_time.slice(0, 5)}</td>
                  <td>
                    <span className="client-cell">
                      <b>{appointment.customer_name.charAt(0)}</b>
                      {appointment.customer_name}
                    </span>
                  </td>
                  <td>{appointment.phone}</td>
                  <td>
                    {appointment.services
                      .map((service) => service.service_name)
                      .join(", ") || "Serviço não informado"}
                  </td>
                  <td>
                    {appointment.total_duration_minutes ||
                      appointment.duration_minutes}{" "}
                    min
                  </td>
                  <td>
                    <span
                      className={`appointment-status status-${appointment.status}`}
                    >
                      {statusLabels[appointment.status] ||
                        appointment.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onViewDetails(appointment)}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AppointmentsTable;
