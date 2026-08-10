function PendingList({ items }) {
  return (
    <section className="admin-section" id="pendencias">
      <div className="admin-section__heading">
        <div>
          <span>ATENÇÃO</span>
          <h2>Pendências importantes</h2>
        </div>
      </div>

      <div className="pending-list">
        {items.map((item) => (
          <article key={item.label}>
            <span className={`pending-dot ${item.tone}`} />
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
            {item.onClick ? (
              <button type="button" onClick={item.onClick}>{item.action}</button>
            ) : (
              <a href={item.href}>{item.action}</a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default PendingList;
