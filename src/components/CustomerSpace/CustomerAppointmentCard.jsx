import { CalendarDays, Clock3, Hourglass, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { appointmentStatusLabel, formatAppointmentDate, formatCurrency, getAppointmentImage, getAppointmentValue, normalizeStatus } from "../../utils/customerAppointments";
import ImageWithFallback from "../Image/ImageWithFallback";

const serviceNames = (appointment) => {
  const names = appointment.services?.map((service) => service.name || service.title).filter(Boolean);
  return names?.length ? names.join(" + ") : appointment.serviceName;
};

export default function CustomerAppointmentCard({ appointment, featured = false, showActions = false }) {
  const image = getAppointmentImage(appointment);
  return (
    <article className={`customer-appointment-card${featured ? " customer-appointment-card--featured" : ""}`}>
      {image ? <ImageWithFallback src={image} alt={`Resultado de ${serviceNames(appointment)}`} /> : <div style={{width:'100%',height:120,background:'#f5efe9'}} aria-hidden="true" />}
      <div className="customer-appointment-card__body">
        <span className={`customer-status customer-status--${String(appointment.status).toLowerCase()}`}>
          {appointmentStatusLabel(appointment.status)}
        </span>
        <h3>{serviceNames(appointment)}</h3>
        <div className="customer-appointment-card__facts">
          <span><UserRound size={15} /> Thaís Santos</span>
          <span><CalendarDays size={15} /> {formatAppointmentDate(appointment.date)}</span>
          <span><Clock3 size={15} /> {appointment.time}</span>
          {appointment.durationMinutes && <span><Hourglass size={15} /> {appointment.durationMinutes} minutos</span>}
        </div>
        <strong>{formatCurrency(getAppointmentValue(appointment))}</strong>
        {normalizeStatus(appointment.status)==="nao_compareceu"&&<p className="customer-appointment-card__notice">Este atendimento foi registrado como não comparecimento.</p>}
        {showActions && <div className="customer-appointment-card__actions"><Link to={`/minha-conta/agendamentos/${appointment.id}`}>Ver detalhes e opções</Link></div>}
      </div>
    </article>
  );
}
