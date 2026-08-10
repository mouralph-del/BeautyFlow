import { useState } from "react";

import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import "./AdminPanel.css";

function AdminLayout({ children, notifications = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="admin-shell">
      <AdminSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="admin-shell__main">
        <AdminHeader
          notifications={notifications}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <main className="admin-content">{children}</main>

        <footer className="admin-footer">
          Beauty Studio © 2026 · Todos os direitos reservados. · BeautyFlow v1.0
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
