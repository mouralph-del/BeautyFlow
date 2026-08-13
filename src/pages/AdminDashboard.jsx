import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  CircleCheckBig,
  Clock3,
  WalletCards,
} from "lucide-react";

import AdminLayout from "../components/admin/AdminLayout";
import AdminNotifications from "../components/admin/AdminNotifications";
import AppointmentsTable from "../components/admin/AppointmentsTable";
import CalendarAvailability from "../components/admin/CalendarAvailability";
import DashboardCard from "../components/admin/DashboardCard";
import DailyExperience from "../components/admin/DailyExperience";
import MonthlySummary from "../components/admin/MonthlySummary";
import MonthlyScheduleRelease from "../components/admin/MonthlyScheduleRelease";
import PendingList from "../components/admin/PendingList";
import FirstAccessChecklist from "../components/admin/FirstAccessChecklist";
import Modal from "../components/Modal/Modal";
import { getAdminDashboardData } from "../services/adminDashboard";
import { markNotificationRead } from "../services/adminNotifications";
import { useAuth } from "../contexts/useAuth";
import { getAdminFirstName } from "../utils/dailyExperience";
import services from "../data/services";

const formatDatabaseDate = (date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function AdminDashboard() {
  const { user } = useAuth();
  const administratorName = getAdminFirstName(user);
  const [data, setData] = useState({
    appointments: [],
    bookingRequests: [],
    notifications: [],
    notificationUnreadCount: 0,
    warnings: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [scheduleReviewSignal, setScheduleReviewSignal] = useState(0);
  const minimumServiceDuration = useMemo(() => {
    const durations = services
      .filter((service) => service.active)
      .map((service) => service.durationMinutes);

    return durations.length ? Math.min(...durations) : 30;
  }, []);
  const today = formatDatabaseDate(referenceDate);

  useEffect(() => {
    setLoading(true);
    getAdminDashboardData(referenceDate)
      .then(setData)
      .catch(() => {
        console.error("Não foi possível carregar o dashboard.");
        setData((current) => ({
          ...current,
          warnings: [
            "Não foi possível carregar os dados administrativos.",
          ],
        }));
      })
      .finally(() => setLoading(false));
  }, [referenceDate]);

  const metrics = useMemo(() => {
    const todayAppointments = data.appointments.filter(
      (appointment) => appointment.appointment_date === today
    );

    return {
      today: todayAppointments.length,
      awaitingPayment: data.appointments.filter(
        (appointment) =>
          appointment.payment_status === "aguardando_pagamento"
      ).length,
      paymentReview: data.appointments.filter(
        (appointment) => appointment.payment_status === "em_analise"
      ).length,
      confirmed: data.appointments.filter(
        (appointment) => appointment.status === "confirmado"
      ).length,
    };
  }, [data.appointments, today]);

  const statusGroup = (appointment) => {
    if (appointment.status === "cancelado") return "cancelled";
    if (appointment.status === "concluido") return "completed";
    if (appointment.status === "confirmado") return "confirmed";
    if (appointment.payment_status === "em_analise" || appointment.status === "aguardando_aprovacao") return "payment_review";
    if (appointment.payment_status === "aguardando_pagamento") return "awaiting_payment";
    return "all";
  };

  const appointmentFilters = useMemo(() => {
    const options = [
      ["all", "Todos"],
      ["confirmed", "Confirmados"],
      ["payment_review", "Pagamento em análise"],
      ["awaiting_payment", "Aguardando pagamento"],
      ["cancelled", "Cancelados"],
      ["completed", "Concluídos"],
    ];
    return options.map(([value, label]) => ({
      value,
      label,
      count: value === "all" ? data.appointments.length : data.appointments.filter((item) => statusGroup(item) === value).length,
    }));
  }, [data.appointments]);

  const filteredAppointments = useMemo(
    () => appointmentFilter === "all" ? data.appointments : data.appointments.filter((item) => statusGroup(item) === appointmentFilter),
    [appointmentFilter, data.appointments]
  );

  const nextMonth = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    []
  );

  const monthlySummary = useMemo(() => {
    const serviceCounts = {};

    data.appointments.forEach((appointment) => {
      appointment.services.forEach((service) => {
        serviceCounts[service.service_name] =
          (serviceCounts[service.service_name] ?? 0) + 1;
      });
    });

    const mostRequestedService =
      Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Sem dados no período";

    const pastAppointments = data.appointments.filter(
      (appointment) =>
        new Date(
          `${appointment.appointment_date}T${appointment.appointment_time}`
        ) < referenceDate
    );
    const attended = pastAppointments.filter((appointment) =>
      ["confirmado", "concluido"].includes(appointment.status)
    ).length;
    const paidReservations = data.appointments
      .filter((appointment) => appointment.reservation_paid)
      .reduce(
        (total, appointment) =>
          total + Number(appointment.reservation_amount || 0),
        0
      );

    return {
      mostRequestedService,
      appointmentsCount: data.appointments.length,
      attendanceRate:
        pastAppointments.length > 0
          ? `${Math.round((attended / pastAppointments.length) * 100)}%`
          : "Sem dados",
      reservationRevenue: formatCurrency(paidReservations),
    };
  }, [data.appointments, referenceDate]);

  const pendingItems = [
    {
      label: "Comprovantes aguardando análise",
      value: metrics.paymentReview,
      action: "Analisar",
      href: "/admin/pagamentos",
      tone: "copper",
    },
    {
      label: "Solicitações de encaixe",
      value: data.bookingRequests.length,
      action: "Ver agenda",
      href: "#agenda",
      tone: "gold",
    },
    {
      label: "Pagamentos recusados no mês",
      value: data.appointments.filter(
        (appointment) => appointment.payment_status === "recusado"
      ).length,
      action: "Consultar",
      href: "/admin/pagamentos",
      tone: "rose",
    },
    ...(data.notifications.some((notification) => notification.type?.startsWith("schedule_release_reminder_")) ? [{
      label: "Agenda do próximo mês ainda não liberada",
      value: data.notifications.filter((notification) => !notification.is_read && notification.type?.startsWith("schedule_release_reminder_")).length,
      action: "Revisar e liberar",
      onClick: () => setScheduleReviewSignal((value) => value + 1),
      tone: "gold",
    }] : []),
  ];

  const notifications = data.notificationUnreadCount;

  const viewNotification = async (notification) => {
    setSelectedNotification(notification);
    if (notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      setData((current) => ({
        ...current,
        notificationUnreadCount: Math.max(0, current.notificationUnreadCount - 1),
        notifications: current.notifications.map((item) => item.id === notification.id ? { ...item, is_read: true } : item),
      }));
    } catch {
      console.error("Não foi possível marcar a notificação como lida.");
    }
  };

  return (
    <AdminLayout notifications={notifications}>
      <FirstAccessChecklist />
      <DailyExperience
        data={data}
        name={administratorName}
        now={new Date()}
        onClosed={() => getAdminDashboardData(referenceDate).then(setData)}
      />

      {data.warnings.length > 0 && (
        <div className="admin-data-warning">
          <strong>Alguns dados não puderam ser carregados:</strong>
          {data.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      )}

      <section className="dashboard-cards">
        <DashboardCard
          icon={CalendarCheck2}
          label="Agendamentos de hoje"
          value={loading ? "—" : metrics.today}
          detail={today.split("-").reverse().join("/")}
        />
        <DashboardCard
          icon={Clock3}
          label="Aguardando pagamento"
          value={loading ? "—" : metrics.awaitingPayment}
          detail="Reservas ainda não pagas"
        />
        <DashboardCard
          icon={WalletCards}
          label="Pagamento em análise"
          value={loading ? "—" : metrics.paymentReview}
          detail="Comprovantes recebidos"
        />
        <DashboardCard
          icon={CircleCheckBig}
          label="Atendimentos confirmados"
          value={loading ? "—" : metrics.confirmed}
          detail="No mês atual"
        />
      </section>

      <div className="admin-schedule-grid">
        <AppointmentsTable
          appointments={filteredAppointments}
          onViewDetails={setSelectedAppointment}
          referenceDate={referenceDate}
          onPreviousMonth={() => setReferenceDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          onNextMonth={() => setReferenceDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          filters={appointmentFilters}
          selectedFilter={appointmentFilter}
          onFilterChange={setAppointmentFilter}
          loading={loading}
        />

        <CalendarAvailability
          appointments={data.appointments}
          bookingRequests={data.bookingRequests}
          referenceDate={referenceDate}
          minimumServiceDuration={minimumServiceDuration}
        />
      </div>

      <MonthlyScheduleRelease date={nextMonth} reviewSignal={scheduleReviewSignal} />

      <AdminNotifications
        notifications={data.notifications}
        onViewDetails={viewNotification}
      />

      <div className="admin-overview-bottom-grid">
        <PendingList items={pendingItems} />
        <MonthlySummary summary={monthlySummary} />
      </div>

      {selectedAppointment && (
          <Modal isOpen onClose={() => setSelectedAppointment(null)} title="Detalhes do agendamento" className="admin-detail-modal" overlayClassName="admin-detail-overlay">
            <button
              type="button"
              onClick={() => setSelectedAppointment(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            <span>AGENDAMENTO</span>
            <h3>{selectedAppointment.customer_name}</h3>
            <p>{selectedAppointment.phone}</p>
            <p>{selectedAppointment.email}</p>
            <p>
              {selectedAppointment.services
                .map((service) => service.service_name)
                .join(", ")}
            </p>
            <p>
              {new Date(
                `${selectedAppointment.appointment_date}T12:00:00`
              ).toLocaleDateString("pt-BR")}{" "}
              às {selectedAppointment.appointment_time.slice(0, 5)}
            </p>
          </Modal>
      )}

      {selectedNotification && (
          <Modal isOpen onClose={() => setSelectedNotification(null)} title="Detalhes da notificação" describedBy="dashboard-notification-message" className="admin-detail-modal" overlayClassName="admin-detail-overlay">
            <button
              type="button"
              onClick={() => setSelectedNotification(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            <span>NOTIFICAÇÃO</span>
            <h3>{selectedNotification.title}</h3>
            <p id="dashboard-notification-message">{selectedNotification.message}</p>
            <p>
              {new Date(selectedNotification.created_at).toLocaleString(
                "pt-BR"
              )}
            </p>
          </Modal>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;
