import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";

import "react-datepicker/dist/react-datepicker.css";
import FitRequestModal from "../components/booking/FitRequestModal";
import PaymentStep from "../components/booking/PaymentStep";
import ApprovalPendingStep from "../components/booking/ApprovalPendingStep";
import useServiceCatalog from "../hooks/useServiceCatalog";
import usePromotions from "../hooks/usePromotions";
import Layout from "../layouts/Layout";
import { createBookingRequest, submitFitPaymentProof } from "../services/bookingRequests";
import {
  createCompleteAppointment,
  getBookedTimesByDate,
} from "../services/appointments";
import { getReleasedSchedules } from "../services/monthlySchedule";
import { getPublicDayAvailability } from "../services/settings";
import { calculatePromotion } from "../services/promotions";
import usePublicSettings from "../hooks/usePublicSettings";
import { useAuth } from "../contexts/useAuth";
import { getOwnCustomerProfile, saveOwnCustomerProfile } from "../services/customerProfile";
import {
  getTimeSlotStatus,
  minutesToTime,
  timeToMinutes,
} from "../utils/timeUtils";
import "./Booking.css";
import { formatErrorMessage } from "../components/Error/errorMapper";

registerLocale("pt-BR", ptBR);

const formatWhatsApp = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(
    2,
    7
  )}-${digits.slice(7)}`;
};

const isValidWhatsApp = (value) =>
  /^\(\d{2}\) \d{5}-\d{4}$/.test(value);

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const currencyToNumber = (value) => {
  const normalizedValue = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Number(normalizedValue) || 0;
};

const formatCurrency = (value) => {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
};

const createAppointmentDateTime = (selectedDate, time) => {
  if (!selectedDate || !time) {
    return null;
  }

  const date = new Date(selectedDate);
  const [hours, minutes] = time.split(":").map(Number);

  date.setHours(hours, minutes, 0, 0);

  return date;
};

const isPastTime = (selectedDate, time, currentTime) => {
  const appointmentDateTime = createAppointmentDateTime(
    selectedDate,
    time
  );

  if (!appointmentDateTime) {
    return false;
  }

  return appointmentDateTime <= currentTime;
};

const formatDateForDatabase = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function Booking() {
  const { user } = useAuth();
  const services = useServiceCatalog();
  const promotions = usePromotions("services");
  const publicSettings = usePublicSettings();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fitPayment = location.state?.fitPayment;
  const preselectedServiceIds = location.state?.preselectedServiceIds;

  const service = services.find(
    (item) => item.id === Number(id)
  );

  const [selectedDate, setSelectedDate] = useState(fitPayment?.appointmentDate ? new Date(`${fitPayment.appointmentDate}T12:00:00`) : null);
  const [selectedTime, setSelectedTime] = useState(fitPayment?.appointmentTime || "");
  const [selectedServices, setSelectedServices] = useState(() => {
    const requested = Array.isArray(preselectedServiceIds) ? services.filter((item) => preselectedServiceIds.map(String).includes(String(item.id))) : [];
    return requested.length ? requested : service ? [service] : [];
  });

  useEffect(() => {
    if (!service) return;
    setSelectedServices((currentServices) =>
      currentServices.map((currentService) =>
        currentService.id === Number(id) ? service : currentService
      )
    );
  }, [id, service]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [step, setStep] = useState(fitPayment ? 4 : 1);
  const stepperStep = Math.min(step, 3);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [releasedSchedules, setReleasedSchedules] = useState([]);
  const [dayAvailability, setDayAvailability] = useState({ special_hours: null, blocks: [] });
  const [isRequestModalOpen, setIsRequestModalOpen] =
    useState(false);
  const [fitPreferences, setFitPreferences] = useState(null);
  const [fitRequestCompleted, setFitRequestCompleted] = useState(false);
  const [bookingType, setBookingType] =
    useState("normal");
  const [isSubmittingRequest, setIsSubmittingRequest] =
    useState(false);
  const [errors, setErrors] = useState({});
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [reservationPolicyAnswered, setReservationPolicyAnswered] =
    useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [confirmingProfile, setConfirmingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    imageAuthorization: "",
    reservationPolicyAccepted: false,
  });

  useEffect(() => {
    if (!user || user.app_metadata?.role === "admin") return;
    getOwnCustomerProfile().then((profile) => {
      setProfileComplete(Boolean(profile?.is_complete));
      setCustomerData((current) => ({ ...current, name: profile?.full_name || "", phone: profile?.phone || "", email: user.email || profile?.email || "" }));
    }).catch(() => console.error("Não foi possível carregar o perfil da cliente."));
  }, [user]);

  useEffect(() => {
    getReleasedSchedules()
      .then(setReleasedSchedules)
      .catch(() => {
        console.error("Não foi possível consultar os meses liberados.");
        setReleasedSchedules([]);
      });
  }, []);

  const totalDuration = selectedServices.reduce(
    (total, selectedService) =>
      total + selectedService.durationMinutes,
    0
  );
  const selectedRelease = selectedDate
    ? releasedSchedules.find((item) => item.year === selectedDate.getFullYear() && item.month === selectedDate.getMonth() + 1)
    : null;
  const selectedSpecialHours = selectedDate
    ? selectedRelease?.special_hours?.[formatDateForDatabase(selectedDate)]
    : null;
  const configuredDay = selectedDate
    ? publicSettings.schedule.days?.[String(selectedDate.getDay())]
    : null;
  const activeSchedule = selectedSpecialHours ?? dayAvailability.special_hours ?? configuredDay;

  const originalTotalPrice = selectedServices.reduce(
    (total, selectedService) =>
      total + currencyToNumber(selectedService.price),
    0
  );

  const selectedPromotion = promotions.find((promotion) =>
    selectedServices.length > 0 && selectedServices.every((selectedService) =>
      selectedService.dbId && (
        promotion.applies_to_all_services ||
        promotion.service_ids?.map(Number).includes(Number(selectedService.dbId))
      )
    )
  );
  const totalPrice = selectedPromotion
    ? calculatePromotion(originalTotalPrice, selectedPromotion).final
    : originalTotalPrice;

  const totalDeposit = selectedServices.reduce(
    (total, selectedService) =>
      total + currencyToNumber(selectedService.reservationFee),
    0
  );

  const remainingAmount = totalPrice - totalDeposit;

  const handleAddService = (serviceToAdd) => {
    const alreadySelected = selectedServices.some(
      (selectedService) => selectedService.id === serviceToAdd.id
    );

    if (alreadySelected) {
      return;
    }

    setSelectedServices((currentServices) => [
      ...currentServices,
      serviceToAdd,
    ]);
    setSelectedTime("");
  };

  const handleRemoveService = (serviceId) => {
    if (selectedServices.length === 1) {
      return;
    }

    setSelectedServices((currentServices) =>
      currentServices.filter(
        (selectedService) => selectedService.id !== serviceId
      )
    );
    setSelectedTime("");
  };

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone"
      ? formatWhatsApp(value)
      : value;

    setCustomerData((currentData) => ({
      ...currentData,
      [name]: nextValue,
    }));

    if (name === "phone") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phone:
          phoneTouched &&
          nextValue &&
          !isValidWhatsApp(nextValue)
            ? "Informe um número de WhatsApp válido."
            : "",
      }));
    }

    if (name === "email") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email:
          nextValue && !isValidEmail(nextValue)
            ? "Informe um endereço de e-mail válido."
            : "",
      }));
    }

    if (name === "imageAuthorization") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        imageAuthorization: "",
      }));
    }
  };

  const handleContactBlur = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      setPhoneTouched(true);
    }

    if (
      name === "phone" &&
      value &&
      !isValidWhatsApp(value)
    ) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phone: "Informe um número de WhatsApp válido.",
      }));
    }

    if (name === "email" && !isValidEmail(value)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: "Informe um endereço de e-mail válido.",
      }));
    }
  };

  const handleCustomerContinue = async () => {
    const newErrors = {};

    if (customerData.name.trim().length < 3) newErrors.name = "Informe seu nome completo.";

    if (!isValidWhatsApp(customerData.phone)) {
      newErrors.phone = "Informe um número de WhatsApp válido.";
    }

    if (!isValidEmail(user?.email || customerData.email)) {
      newErrors.email = "Informe um endereço de e-mail válido.";
    }

    if (!customerData.imageAuthorization) {
      newErrors.imageAuthorization =
        "Escolha se autoriza ou não o uso de imagem.";
    }

    if (customerData.reservationPolicyAccepted !== true) {
      newErrors.reservationPolicy =
        "Para continuar com o agendamento, é necessário estar ciente e concordar com a política de reserva do estúdio.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      if (user && user.app_metadata?.role !== "admin") {
        setConfirmingProfile(true);
        const profile = await saveOwnCustomerProfile({ fullName: customerData.name, phone: customerData.phone });
        setCustomerData((current) => ({ ...current, email: profile.email }));
        setProfileComplete(true); setEditingProfile(false);
      }
      setStep(3);
    } catch (profileError) {
      setErrors((current) => ({ ...current, profile: formatErrorMessage(profileError) || "Não foi possível salvar seus dados." }));
    } finally { setConfirmingProfile(false); }
  };

  const handleReservationPolicyChange = (accepted) => {
    setCustomerData((currentData) => ({
      ...currentData,
      reservationPolicyAccepted: accepted,
    }));
    setReservationPolicyAnswered(true);
    setErrors((currentErrors) => ({
      ...currentErrors,
      reservationPolicy: accepted
        ? ""
        : "Para continuar com o agendamento, é necessário estar ciente e concordar com a política de reserva do estúdio.",
    }));
  };

  const isAvailableDay = (date) => {
    const dateValue = formatDateForDatabase(date);
    const release = releasedSchedules.find(
      (item) => item.year === date.getFullYear() && item.month === date.getMonth() + 1
    );

    const daySettings = publicSettings.schedule.days?.[String(date.getDay())];
    return Boolean(daySettings?.active) && Boolean(release) && !(release.blocked_dates ?? []).includes(dateValue);
  };

  const generateTimeSlots = () => {
    if (!selectedDate) {
      return [];
    }

    const times = [];

    if (!activeSchedule?.active && !selectedSpecialHours && !dayAvailability.special_hours) return [];
    let currentMinutes = timeToMinutes(activeSchedule.opening ?? activeSchedule.open);
    const endMinutes = timeToMinutes(activeSchedule.closing ?? activeSchedule.close);

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;

      const formattedTime = `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}`;

      times.push(formattedTime);

      currentMinutes += Number(publicSettings.schedule.slot_interval) || 30;
    }

    return times;
  };

  const timeSlots = generateTimeSlots();
  const visibleTimes = timeSlots
    .map((time) => ({
      time,
      status: getTimeSlotStatus({
        startTime: time,
        durationMinutes: totalDuration,
        selectedDate,
        bookedAppointments,
        scheduleOverride: activeSchedule,
        blockedIntervals: dayAvailability.blocks,
      }),
    }))
    .map((slot) => ({
      ...slot,
      status:
        slot.status !== "hidden" &&
        isPastTime(selectedDate, slot.time, currentTime)
          ? "unavailable"
          : slot.status,
    }))
    .filter((slot) => slot.status !== "hidden");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      selectedTime &&
      isPastTime(selectedDate, selectedTime, currentTime)
    ) {
      setSelectedTime("");
    }
  }, [currentTime, selectedDate, selectedTime]);

  useEffect(() => {
    if (!selectedDate) {
      setDayAvailability({ special_hours: null, blocks: [] });
      return;
    }
    let active = true;
    getPublicDayAvailability(formatDateForDatabase(selectedDate))
      .then((value) => active && setDayAvailability(value))
      .catch(() => {
        console.error("Não foi possível consultar as exceções da agenda.");
        if (active) setDayAvailability({ special_hours: null, blocks: [] });
      });
    return () => { active = false; };
  }, [selectedDate]);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate) {
        setBookedAppointments([]);
        return;
      }

      const formattedDate = formatDateForDatabase(selectedDate);

      try {
        const appointments =
          await getBookedTimesByDate(formattedDate);
        setBookedAppointments(appointments);
      } catch {
        console.error("Não foi possível buscar os horários ocupados.");
        setBookedAppointments([]);
      }
    };

    fetchBookedTimes();
  }, [selectedDate]);

  const handleBookingRequest = async () => {
    setIsSubmittingRequest(true);

    const requestData = {
      service_id: service.id,
      service_name: selectedServices
        .map((selectedService) => selectedService.title)
        .join(" + "),
      duration_minutes: totalDuration,
      total_price: totalPrice,
      reservation_amount: totalDeposit,
      remaining_amount: remainingAmount,
      preferred_period: fitPreferences?.preferredPeriod,
      specific_time: fitPreferences?.specificTime || null,
      services_data: selectedServices.map((selectedService) => ({
        service_id: selectedService.id,
        service_name: selectedService.title,
        duration_minutes: selectedService.durationMinutes,
        service_price: currencyToNumber(selectedService.price),
        reservation_amount: currencyToNumber(selectedService.reservationFee),
      })),

      customer_name: customerData.name,
      phone: customerData.phone,
      email: user?.email || customerData.email,
      notes: fitPreferences?.requestNotes || customerData.notes || null,
      image_authorization:
        customerData.imageAuthorization === "yes",

      appointment_date: formatDateForDatabase(selectedDate),

      appointment_time: fitPreferences?.specificTime || "08:00",
    };

    try {
      await createBookingRequest(requestData);
      setFitRequestCompleted(true);


    } catch (error) {

      console.error("Não foi possível enviar a solicitação de encaixe.");

      setErrors((current) => ({
        ...current,
        fitRequest: formatErrorMessage(error) || "Não foi possível enviar a solicitação.",
      }));

    } finally {

      setIsSubmittingRequest(false);

    }
  };

  const handleFinalizeAppointment = async (paymentProof) => {
    if (fitPayment) {
      await submitFitPaymentProof(fitPayment.requestId, paymentProof);
      setStep(5);
      return;
    }
    if (!isValidWhatsApp(customerData.phone)) {
      throw new Error("Informe um número de WhatsApp válido.");
    }

    if (!isValidEmail(customerData.email)) {
      throw new Error("Informe um endereço de e-mail válido.");
    }

    if (customerData.reservationPolicyAccepted !== true) {
      throw new Error(
        "Para continuar com o agendamento, é necessário estar ciente e concordar com a política de reserva do estúdio."
      );
    }

    if (bookingType === "request") {
      await handleBookingRequest();
      return;
    }

    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      throw new Error(
        "Os dados do agendamento estão incompletos. Volte e revise data, horário e serviços."
      );
    }

    const appointmentData = {
      customer_name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      email: (user?.email || customerData.email).trim(),
      notes: customerData.notes.trim() || null,
      appointment_date: formatDateForDatabase(selectedDate),
      appointment_time: selectedTime,
      end_time: minutesToTime(
        timeToMinutes(selectedTime) + totalDuration
      ),
      status: "aguardando_aprovacao",
      payment_status: "em_analise",
      reservation_paid: false,
      image_authorization:
        customerData.imageAuthorization === "yes",
      reservation_policy_accepted:
        customerData.reservationPolicyAccepted,
      service_price: totalPrice,
      reservation_amount: totalDeposit,
      remaining_amount: remainingAmount,
      payment_proof: null,
      duration_minutes: totalDuration,
      total_duration_minutes: totalDuration,
      promotion_id: selectedPromotion?.id ?? null,
    };

    const appointmentServices = selectedServices.map(
      (selectedService) => ({
        service_id: selectedService.id,
        catalog_service_id: selectedService.dbId,
        service_name: selectedService.title,
        duration_minutes: selectedService.durationMinutes,
        service_price: currencyToNumber(selectedService.price),
        reservation_amount: currencyToNumber(
          selectedService.reservationFee
        ),
      })
    );

    try {
      await createCompleteAppointment({
        appointmentData,
        appointmentServices,
        paymentProof,
      });

      setStep(5);
    } catch (error) {
      console.error("Não foi possível confirmar o agendamento.");

      if (error.code === "23505") {
        throw new Error(
          "Este horário acabou de ser reservado. Volte e escolha outro horário."
        );
      }

      throw new Error(
        formatErrorMessage(error) ||
          "Não foi possível confirmar o agendamento. Tente novamente."
      );
    }
  };

  if (!service) {
    return (
      <Layout>
        <main className="booking">
          <h1>Serviço indisponível</h1>
          <p>Este procedimento está pausado ou não está mais disponível.</p>
        </main>
      </Layout>
    );
  }

  if (fitRequestCompleted) {
    return (
      <Layout>
        <main className="booking">
          <section className="booking__success">
            <h1>Solicitação enviada com sucesso!</h1>
            <p>Seu pedido de encaixe está aguardando análise da profissional.</p>
            <p>Você poderá acompanhar a resposta no Meu Espaço.</p>
            <button className="booking__continue" onClick={() => navigate("/minha-conta")}>Acessar Meu Espaço</button>
          </section>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="booking-page">
        {step === 1 && (
          <button
            type="button"
            className="booking-back"
            onClick={() => navigate(`/servicos/${service.slug}`)}
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </button>
        )}

        <div className="booking booking-container">
          <h1 hidden={step === 5}>Agendamento</h1>

        {step === 4 && (
          <button
            type="button"
            className="booking-back-button"
            onClick={() => setStep(3)}
          >
            <span aria-hidden="true">←</span>
            Voltar para revisão
          </button>
        )}

        {step !== 5 && (
        <div className="booking__service">
          <div className="booking__content">
            <span>{service.category}</span>

            <h2>{service.title}</h2>

            <p>{service.description}</p>

            <div className="booking__info">
              <p>⏱ {service.duration}</p>

              <p>💰 {service.price}</p>

              <p>📌 Reserva: {service.reservationFee}</p>
            </div>
          </div>
        </div>
        )}

        {step !== 5 && (
        <div className="booking__steps">
          <div
            className={`booking__step ${
              stepperStep >= 1 ? "booking__step--active" : ""
            }`}
          >
            <div className="booking__circle">
              {stepperStep > 1 ? "✓" : "1"}
            </div>

            <span>Escolha</span>
          </div>

          <div className="booking__line" />

          <div
            className={`booking__step ${
              stepperStep >= 2 ? "booking__step--active" : ""
            }`}
          >
            <div className="booking__circle">
              {stepperStep > 2 ? "✓" : "2"}
            </div>

            <span>Dados</span>
          </div>

          <div className="booking__line" />

          <div
            className={`booking__step ${
              stepperStep >= 3 ? "booking__step--active" : ""
            }`}
          >
            <div className="booking__circle">
              3
            </div>

            <span>Confirmação</span>
          </div>
        </div>
        )}

        {step === 1 && (
          <>
            <section className="selected-services">
              <div className="selected-services__header">
                <div>
                  <span>Seu atendimento</span>
                  <strong>
                    {selectedServices.length}{" "}
                    {selectedServices.length === 1
                      ? "serviço selecionado"
                      : "serviços selecionados"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="add-service-button"
                  onClick={() => setShowServiceSelector(true)}
                >
                  + Adicionar outro serviço
                </button>
              </div>

              <div className="selected-services__list">
                {selectedServices.map((selectedService) => (
                  <div
                    key={selectedService.id}
                    className="selected-service-item"
                  >
                    <div>
                      <strong>{selectedService.title}</strong>

                      <span>
                        {formatDuration(selectedService.durationMinutes)}
                        {" • "}
                        {selectedService.price}
                      </span>
                    </div>

                    {selectedServices.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveService(selectedService.id)
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="selected-services__totals">
                <span>
                  Duração total:
                  <strong>{formatDuration(totalDuration)}</strong>
                </span>

                <span>
                  Valor total:
                  <strong>{formatCurrency(totalPrice)}</strong>
                </span>

                <span>
                  Reserva:
                  <strong>{formatCurrency(totalDeposit)}</strong>
                </span>
              </div>
            </section>

            {showServiceSelector && (
              <section className="additional-services">
                <div className="additional-services__header">
                  <h3>Adicionar outro serviço</h3>

                  <button
                    type="button"
                    onClick={() => setShowServiceSelector(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className="additional-services__grid">
                  {services
                    .filter(
                      (availableService) =>
                        availableService.active &&
                        !selectedServices.some(
                          (selectedService) =>
                            selectedService.id === availableService.id
                        )
                    )
                    .map((availableService) => (
                      <button
                        key={availableService.id}
                        type="button"
                        className="additional-service-card"
                        onClick={() => {
                          handleAddService(availableService);
                          setShowServiceSelector(false);
                        }}
                      >
                        <strong>{availableService.title}</strong>
                        <span>
                          {formatDuration(availableService.durationMinutes)}
                        </span>
                        <span>{availableService.price}</span>
                        <small>
                          Reserva: {availableService.reservationFee}
                        </small>
                      </button>
                    ))}
                </div>
              </section>
            )}

            <section className="booking__calendar">
              <h2>📅 Escolha uma data</h2>

              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setSelectedTime("");
                }}
                minDate={new Date()}
                filterDate={isAvailableDay}
                locale="pt-BR"
                dateFormat="dd/MM/yyyy"
                inline
              />
            </section>

            {selectedDate && (
              <section className="booking__times">
                <h2>⏰ Horários disponíveis</h2>

                {visibleTimes.length > 0 ? (
                  <div className="booking__times-grid">
                    {visibleTimes.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        className={`time-slot booking__time time-slot--${slot.status} ${
                          selectedTime === slot.time
                            ? "selected booking__time--selected"
                            : ""
                        }`}
                        disabled={slot.status === "unavailable"}
                        onClick={() => {
                          if (slot.status === "available") {
                            setSelectedTime(slot.time);
                            setBookingType("normal");
                            return;
                          }

                          if (slot.status === "approval") {
                            setIsRequestModalOpen(true);
                          }
                        }}
                      >
                        <span>{slot.time}</span>

                        {slot.status === "unavailable" && (
                          <small>Indisponível</small>
                        )}

                        {slot.status === "approval" && (
                          <small>Solicitar encaixe</small>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p className="booking__no-times">
                      Não há horários disponíveis para esta data.
                      Escolha outro dia.
                    </p>
                    <button type="button" className="booking__fit-request" onClick={() => setIsRequestModalOpen(true)}>Solicitar encaixe</button>
                  </div>
                )}

                {visibleTimes.length > 0 && (
                  <button type="button" className="booking__fit-link" onClick={() => setIsRequestModalOpen(true)}>Não encontrei um horário</button>
                )}

                <button
                  className="booking__continue"
                  disabled={!selectedTime}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </button>
              </section>
            )}
          </>
        )}

        {step === 2 && (
          <section className="booking__customer">
            <h2>Seus dados</h2>

            {user && profileComplete && !editingProfile && (
              <article className="customer-profile-confirmation">
                <h3>Confirme seus dados</h3>
                <p><strong>Nome:</strong> {customerData.name}</p>
                <p><strong>Telefone:</strong> {customerData.phone}</p>
                <p><strong>E-mail:</strong> {user.email}</p>
                <div><button type="button" onClick={() => setEditingProfile(true)}>Alterar dados</button><button type="button" className="primary" onClick={() => setEditingProfile(true)}>Confirmar e continuar</button></div>
                <small>As autorizações e a política atual ainda serão confirmadas para este agendamento.</small>
              </article>
            )}

            <label>
              Nome completo
              <input
                type="text"
                name="name"
                value={customerData.name}
                onChange={handleCustomerChange}
                placeholder="Digite seu nome completo"
                required
              />
              {errors.name && <p className="form-error">{errors.name}</p>}
            </label>

            <label>
              WhatsApp
              <input
                type="tel"
                name="phone"
                value={customerData.phone}
                onChange={handleCustomerChange}
                onBlur={handleContactBlur}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={15}
                required
              />

              {errors.phone && (
                <p className="form-error">{errors.phone}</p>
              )}
            </label>

            <label>
              E-mail
              <input
                type="email"
                name="email"
                value={customerData.email}
                onChange={handleCustomerChange}
                onBlur={handleContactBlur}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                readOnly={Boolean(user)}
                required
              />

              {errors.email && (
                <p className="form-error">{errors.email}</p>
              )}
            </label>
            {user && <small>O e-mail é o mesmo da sua conta autenticada.</small>}
            {errors.profile && <p className="form-error">{errors.profile}</p>}

            <label>
              Observações — opcional
              <textarea
                name="notes"
                value={customerData.notes}
                onChange={handleCustomerChange}
                placeholder="Existe alguma informação importante sobre o atendimento?"
                rows={5}
              />
            </label>

            <div className="image-authorization">
              <div className="image-authorization__heading">
                <h3>Autorização de uso de imagem</h3>

                <span>Obrigatório</span>
              </div>

              <p className="image-authorization__description">
                {publicSettings.policies.image_authorization?.content}
              </p>

              <label
                className={`image-authorization__option ${
                  customerData.imageAuthorization === "yes"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="imageAuthorization"
                  value="yes"
                  checked={customerData.imageAuthorization === "yes"}
                  onChange={handleCustomerChange}
                />

                <div>
                  <strong>Sim, autorizo</strong>

                  <span>
                    Autorizo o uso de fotos ou vídeos do resultado do
                    procedimento para divulgação.
                  </span>
                </div>
              </label>

              <label
                className={`image-authorization__option ${
                  customerData.imageAuthorization === "no"
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="imageAuthorization"
                  value="no"
                  checked={customerData.imageAuthorization === "no"}
                  onChange={handleCustomerChange}
                />

                <div>
                  <strong>Não autorizo</strong>

                  <span>
                    Não autorizo a divulgação de fotos ou vídeos do meu
                    procedimento.
                  </span>
                </div>
              </label>

              {errors.imageAuthorization && (
                <p className="form-error">
                  {errors.imageAuthorization}
                </p>
              )}
            </div>

            <div className="image-authorization">
              <div className="image-authorization__heading">
                <h3>Confirmação da política de reserva</h3>

                <span>Obrigatório</span>
              </div>

              <p className="image-authorization__description">
                {publicSettings.policies.reservation?.content}
              </p>

              <label
                className={`image-authorization__option ${
                  reservationPolicyAnswered &&
                  customerData.reservationPolicyAccepted
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="reservationPolicyAccepted"
                  checked={
                    reservationPolicyAnswered &&
                    customerData.reservationPolicyAccepted
                  }
                  onChange={() => handleReservationPolicyChange(true)}
                />

                <div>
                  <strong>
                    Sim, estou ciente e concordo com a política de reserva.
                  </strong>
                </div>
              </label>

              {errors.reservationPolicy && (
                <p className="form-error">
                  {errors.reservationPolicy}
                </p>
              )}
            </div>

            <div className="booking__actions">
              <button
                type="button"
                className="booking__back-button"
                onClick={() => setStep(1)}
              >
                Voltar
              </button>

              <button
                type="button"
                className="booking__continue"
                disabled={
                  !customerData.name.trim() ||
                  !isValidWhatsApp(customerData.phone) ||
                  !isValidEmail(user?.email || customerData.email) ||
                  confirmingProfile ||
                  customerData.reservationPolicyAccepted !== true
                }
                onClick={handleCustomerContinue}
              >
                {confirmingProfile ? "Salvando dados..." : "Revisar agendamento"}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="booking-review">
            <h2 className="booking-section-title">
              📋 Revise seu agendamento
            </h2>

            <div className="review-card">
              <h3>Serviços selecionados</h3>

              <div className="review-services-list">
                {selectedServices.map((selectedService) => (
                  <div key={selectedService.id}>
                    <strong>{selectedService.title}</strong>
                    <span>
                      {formatDuration(selectedService.durationMinutes)}
                      {" • "}
                      {selectedService.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="review-top-grid">
              <div className="review-card">
                <h3>Data e horário</h3>

                <div className="review-details">
                  <div>
                    <span>Data</span>
                    <p>{selectedDate?.toLocaleDateString("pt-BR")}</p>
                  </div>

                  <div>
                    <span>Horário</span>
                    <p>{selectedTime}</p>
                  </div>
                </div>

                <div className="review-item">
                  <span>📍 Localização</span>
                  <strong>São João Clímaco • São Paulo/SP</strong>
                </div>
              </div>

              <div className="review-card">
                <h3>Seus dados</h3>

                <div className="review-customer">
                  <p>{customerData.name}</p>
                  <p>{customerData.phone}</p>
                  <p>{customerData.email}</p>
                </div>

                {customerData.notes?.trim() && (
                  <div className="review-observation">
                    <span>Observações</span>
                    <p>{customerData.notes}</p>
                  </div>
                )}

                <div className="review-item">
                  <span>Uso de imagem</span>
                  <strong>
                    {customerData.imageAuthorization === "yes"
                      ? "Autorizado"
                      : "Não autorizado"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="review-card review-payment">
              <h3>💰 Resumo do pagamento</h3>

              <div className="payment-row">
                <span>Valor do procedimento</span>
                <strong>{formatCurrency(totalPrice)}</strong>
              </div>

              <div className="payment-row">
                <span>Reserva paga hoje</span>
                <strong>{formatCurrency(totalDeposit)}</strong>
              </div>

              <div className="payment-divider" />

              <div className="payment-row payment-total">
                <span>Restante no atendimento</span>
                <strong>{formatCurrency(remainingAmount)}</strong>
              </div>

              <p className="payment-note">
                ✓ A reserva será descontada do valor total.
              </p>
            </div>

            <div className="review-info">
              <h3>ℹ️ Informações importantes</h3>

              <p>
                A taxa de reserva será abatida do valor total do procedimento.
              </p>

              <p>
                O valor restante será pago presencialmente no dia do atendimento.
              </p>

              <p>
                Após a confirmação do pagamento, seu horário será reservado
                automaticamente.
              </p>

              <p>
                Em caso de cancelamento, será aplicada a política de cancelamento
                do estúdio.
              </p>

              <div className="review-location-note">
                <span>🔒</span>

                <p>
                  O endereço completo será enviado por e-mail após a aprovação do
                  pagamento da reserva.
                </p>
              </div>
            </div>

            <div className="review-actions">
              {errors.fitRequest && <p className="booking__form-error">{errors.fitRequest}</p>}
              <button
                type="button"
                className="review-back-button"
                onClick={() => setStep(2)}
              >
                Voltar
              </button>

              <button
                type="button"
                className="review-payment-button"
                disabled={isSubmittingRequest}
                onClick={() => bookingType === "request" ? handleBookingRequest() : setStep(4)}
              >
                {bookingType === "request" ? (isSubmittingRequest ? "Enviando solicitação..." : "Enviar solicitação de encaixe") : "Continuar para pagamento"}
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <PaymentStep
            bookingData={{
              service,
              selectedServices: fitPayment?.servicesData?.map((item) => ({
                id: item.service_id,
                title: item.service_name,
                durationMinutes: item.duration_minutes,
                price: Number(item.service_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                reservationFee: Number(item.reservation_amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              })) ?? selectedServices,
              selectedDate,
              selectedTime,
              totalDuration: fitPayment?.totalDuration ?? totalDuration,
              totalPrice: fitPayment?.totalPrice ?? totalPrice,
              totalDeposit: fitPayment?.reservationAmount ?? totalDeposit,
              remainingAmount: fitPayment?.remainingAmount ?? remainingAmount,
            }}
            onFinish={handleFinalizeAppointment}
          />
        )}

        {step === 5 && <ApprovalPendingStep />}

        <FitRequestModal
          isOpen={isRequestModalOpen}
          services={selectedServices.map((item) => item.title).join(" + ")}
          duration={totalDuration}
          selectedDate={selectedDate}
          isSubmitting={isSubmittingRequest}
          onClose={() => {
            setIsRequestModalOpen(false);
          }}
          onConfirm={(preferences) => {
            setFitPreferences(preferences);
            setBookingType("request");
            setIsRequestModalOpen(false);
            setStep(2);
          }}
        />
        </div>
      </main>
    </Layout>
  );
}

export default Booking;
