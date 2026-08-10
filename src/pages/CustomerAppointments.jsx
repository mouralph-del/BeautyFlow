import { useMemo, useState } from "react";
// Link removed (unused) to satisfy lint
import CustomerAppointmentCard from "../components/CustomerSpace/CustomerAppointmentCard";
import useCustomerSpaceData from "../hooks/useCustomerSpaceData";
import Layout from "../layouts/Layout";
import { appointmentGroup } from "../utils/customerAppointments";
import "./CustomerAccount.css";
import { SkeletonList } from "../components/Skeleton";
import ErrorMessage from "../components/Error/ErrorMessage";
import EmptyState from "../components/EmptyState/EmptyState";
import { CalendarDays } from 'lucide-react';

const tabs = [{ id: "proximos", label: "Próximos" }, { id: "concluidos", label: "Concluídos" }, { id: "cancelados", label: "Cancelados" }, { id: "reagendados", label: "Reagendados" }];

export default function CustomerAppointments() {
  const [activeTab, setActiveTab] = useState("proximos");
  const { appointments, loading, error, refresh } = useCustomerSpaceData();
  const visible = useMemo(() => appointments.filter((item) => appointmentGroup(item) === activeTab), [appointments, activeTab]);
  return (
    <Layout>
      <main className="customer-account-page">
        <header className="customer-page-hero">
          <span>Minha agenda</span>
          <h1>Meus Agendamentos</h1>
          <p>Acompanhe seus próximos momentos e relembre cada atendimento.</p>
        </header>
        <div className="customer-tabs" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              <span>{appointments.filter((item) => appointmentGroup(item) === tab.id).length}</span>
            </button>
          ))}
        </div>
        {error && <ErrorMessage error={error} onRetry={refresh} />}
        {loading ? (
          <div className="customer-loading">
            <SkeletonList count={3} />
          </div>
        ) : visible.length ? (
          <section className="customer-appointments-grid">{visible.map((item) => <CustomerAppointmentCard key={item.id} appointment={item} showActions={activeTab === "proximos"} />)}</section>
        ) : (
          <EmptyState icon={CalendarDays} title="Nada por aqui ainda" description="Não há agendamentos nesta categoria." actionLabel={activeTab === 'proximos' ? 'Agendar um serviço' : undefined} actionLink={activeTab === 'proximos' ? '/servicos' : undefined} />
        )}
      </main>
    </Layout>
  );
}
