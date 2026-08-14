import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import CustomerAppointmentCard from "../components/CustomerSpace/CustomerAppointmentCard";
import FitRequests from "../components/CustomerSpace/FitRequests";
import RescheduleRequest from "../components/CustomerSpace/RescheduleRequest";
import { useAuth } from "../contexts/useAuth";
import useCustomerSpaceData from "../hooks/useCustomerSpaceData";
import Layout from "../layouts/Layout";
import { getNextAppointment, isCompletedAppointment, toAppointmentDate } from "../utils/customerAppointments";
import "./CustomerSpace.css";
import { SkeletonCard } from "../components/Skeleton";
import ErrorMessage from "../components/Error/ErrorMessage";
import EmptyState from "../components/EmptyState/EmptyState";
import { FilePlus, CalendarDays } from 'lucide-react';

export default function CustomerSpace() {
  const { user } = useAuth();
  const { appointments, promotion, reschedules, fitRequests, loading, error, refresh } = useCustomerSpaceData();
  const [historyIndex, setHistoryIndex] = useState(0);
  const firstName = user?.user_metadata?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "Cliente";
  const history = useMemo(() => appointments.filter(isCompletedAppointment).sort((a,b)=>toAppointmentDate(b)-toAppointmentDate(a)), [appointments]);
  const nextAppointment = useMemo(() => getNextAppointment(appointments), [appointments]);
  const currentHistory = history[Math.min(historyIndex, Math.max(history.length - 1, 0))];

  return (
    <Layout>
      <main className="customer-space">
        <section className="customer-welcome">
          <span>Meu Espaço</span><h1>Olá, {firstName}!</h1>
          <p>Um cantinho pensado para você acompanhar seus momentos de cuidado, descobrir novidades e agendar sua próxima experiência com tranquilidade.</p>
          <p className="customer-signature">Com carinho,<strong>Thaís Santos</strong></p>
          <Link className="customer-primary-action" to="/servicos">Agendar serviços</Link>
        </section>
        {error && <ErrorMessage error={error} onRetry={refresh} />}
        {loading ? (
          <section className="customer-highlights">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </section>
        ) : (
          <section className="customer-highlights">
            <article className="customer-card customer-history-card">
              <div className="customer-card__heading"><div><small>Sua jornada</small><h2>Seu último atendimento</h2></div>{history.length > 1 && <span>Atendimento {historyIndex + 1} de {history.length}</span>}</div>
              {currentHistory ? <CustomerAppointmentCard appointment={currentHistory} featured /> : <EmptyState icon={FilePlus} title="Seu primeiro momento ainda está por vir" description="Assim que você realizar seu primeiro atendimento, ele aparecerá aqui." actionLabel="Agendar serviços" actionLink="/servicos" />}
              {history.length > 1 && <div className="customer-carousel-controls"><button type="button" aria-label="Atendimento anterior" disabled={historyIndex === 0} onClick={() => setHistoryIndex((value) => value - 1)}><ChevronLeft /></button><div>{history.map((item, index) => <button key={item.id} type="button" aria-label={`Ver atendimento ${index + 1}`} className={index === historyIndex ? "active" : ""} onClick={() => setHistoryIndex(index)} />)}</div><button type="button" aria-label="Próximo atendimento" disabled={historyIndex === history.length - 1} onClick={() => setHistoryIndex((value) => value + 1)}><ChevronRight /></button></div>}
              {history.length > 0 && <Link className="customer-card__link" to="/minha-conta/agendamentos">Ver todos os agendamentos</Link>}
            </article>
            <article className="customer-card customer-next-card">
              <small>Próximo encontro</small><h2>{nextAppointment ? "Seu próximo atendimento" : "Vamos cuidar de você?"}</h2>
              {nextAppointment ? <CustomerAppointmentCard appointment={nextAppointment} /> : <EmptyState icon={CalendarDays} title="Vamos cuidar de você?" description="Quando quiser reservar um novo momento, estamos prontas para receber você." actionLabel="Explorar serviços" actionLink="/servicos" />}
            </article>
            <article className="customer-card customer-promotion-card">
              <small>Especial para você</small><h2>{promotion ? "Uma novidade te espera" : "Cuidado em cada detalhe"}</h2>
              <p>{promotion?.description || "Cada atendimento é preparado com delicadeza para valorizar sua beleza natural."}</p>
              <Link className="customer-card__link" to={promotion?.link || "/minha-historia"}>{promotion ? "Ver promoção" : "Conhecer minha história"}</Link>
            </article>
          </section>
        )}
        <FitRequests requests={fitRequests} onChanged={refresh} />
        {(nextAppointment || reschedules?.[0]) && <RescheduleRequest appointment={nextAppointment} request={reschedules?.[0]} onChanged={refresh} />}
        {nextAppointment && <section className="customer-cancellation"><h2>Precisa ajustar seus planos?</h2><p>Consulte os detalhes e veja somente as opções disponíveis para o estado atual.</p><Link to={`/minha-conta/agendamentos/${nextAppointment.id}`}>Ver detalhes e opções</Link></section>}
        <blockquote className="customer-closing">“A verdadeira beleza está nos detalhes e no cuidado com cada cliente.”</blockquote>
      </main>
    </Layout>
  );
}
