function DashboardCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="dashboard-card">
      <span className="dashboard-card__icon">
        <Icon size={21} strokeWidth={1.7} />
      </span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default DashboardCard;

