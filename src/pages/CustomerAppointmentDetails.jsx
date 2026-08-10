import { ArrowLeft, CalendarDays, Clock3, Hourglass, UserRound, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import RescheduleRequest from "../components/CustomerSpace/RescheduleRequest";
import useCustomerSpaceData from "../hooks/useCustomerSpaceData";
import Layout from "../layouts/Layout";
import { SkeletonDetails } from "../components/Skeleton";
import ErrorMessage from "../components/Error/ErrorMessage";
import { appointmentStatusLabel, formatAppointmentDate, formatCurrency, getAppointmentActions, getAppointmentImage } from "../utils/customerAppointments";
import "./CustomerAppointmentDetails.css";

const serviceNames=(appointment)=>appointment.services?.map((service)=>service.name||service.title).filter(Boolean).join(" + ")||appointment.serviceName||"Atendimento";

export default function CustomerAppointmentDetails(){
  const { id }=useParams();
  const { appointments,reschedules,loading,error,refresh }=useCustomerSpaceData();
  const appointment=appointments.find((item)=>String(item.id)===String(id));
  const request=reschedules?.find((item)=>String(item.appointment_id)===String(id));
  if(loading) return <Layout><main className="appointment-details-state" aria-busy="true"><div style={{padding:16}}><SkeletonDetails/></div></main></Layout>;
  if(error) return <Layout><main className="appointment-details-state"><ErrorMessage error={error} onRetry={refresh} /><Link to="/minha-conta/agendamentos">Voltar aos agendamentos</Link></main></Layout>;
  if(!appointment)return <Layout><main className="appointment-details-state"><h1>Atendimento não encontrado</h1><p>Este atendimento pode não estar mais disponível nesta conta.</p><Link to="/minha-conta/agendamentos">Voltar aos agendamentos</Link></main></Layout>;
  const actions=getAppointmentActions(appointment);const image=getAppointmentImage(appointment);
  return <Layout><main className="appointment-details-page"><Link className="appointment-details-back" to="/minha-conta/agendamentos"><ArrowLeft/> Meus agendamentos</Link><header><span>MEU ATENDIMENTO</span><h1>Detalhes do atendimento</h1><p>Confira as informações e as opções disponíveis neste momento.</p></header><section className="appointment-details-card">{image&&<img src={image} alt={`Resultado de ${serviceNames(appointment)}`}/>}<div className="appointment-details-content"><span className="customer-status">{appointmentStatusLabel(appointment.status)}</span><h2>{serviceNames(appointment)}</h2><dl><Fact icon={CalendarDays} label="Data" value={formatAppointmentDate(appointment.date)}/><Fact icon={Clock3} label="Horário" value={appointment.time||"A definir"}/><Fact icon={Hourglass} label="Duração" value={appointment.durationMinutes?`${appointment.durationMinutes} minutos`:"Não informada"}/><Fact icon={UserRound} label="Profissional" value="Thaís Santos"/><Fact icon={WalletCards} label="Valor" value={formatCurrency(appointment.value)}/><Fact icon={WalletCards} label="Taxa de reserva" value={formatCurrency(appointment.reservationAmount)}/><Fact icon={WalletCards} label="Forma de pagamento" value={appointment.paymentMethod||"Pix para reserva"}/></dl>{appointment.publicNotes&&<aside><strong>Observações</strong><p>{appointment.publicNotes}</p></aside>}<div className="appointment-details-actions">{actions.includes("cancel")&&<Link className="danger" to={`/cancelar-agendamento/${appointment.id}`}>Cancelar atendimento</Link>}{actions.includes("fit-response")&&<Link to="/minha-conta#encaixes">Responder proposta</Link>}{actions.includes("payment")&&<p role="status">O envio do comprovante deve ser retomado pelo fluxo em que esta reserva foi criada. Se a opção não estiver disponível, fale com o estúdio.</p>}{actions.length===0&&<p>Este atendimento está disponível somente para consulta.</p>}</div></div></section>{actions.includes("reschedule")&&<RescheduleRequest appointment={appointment} request={request} onChanged={refresh}/>}</main></Layout>;
}
function Fact({icon:Icon,label,value}){return <div><dt><Icon/>{label}</dt><dd>{value}</dd></div>}
