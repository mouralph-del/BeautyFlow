function AdminNotifications({ notifications, onViewDetails }) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="admin-section admin-notification-list">
      <div className="admin-section__heading">
        <div>
          <span>ATUALIZAÇÕES</span>
          <h2>Notificações recentes</h2>
        </div>
      </div>

      <div>
        {notifications.map((notification) => (
          <article key={notification.id} aria-label={notification.is_read ? "Notificação lida" : "Notificação não lida"}>
            {!notification.is_read && <span className="admin-notification-list__dot" />}
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onViewDetails(notification)}
            >
              Ver detalhes
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminNotifications;
