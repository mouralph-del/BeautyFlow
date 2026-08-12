import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";

import "react-datepicker/dist/react-datepicker.css";
import FitRequestModal from "../components/booking/FitRequestModal";
import PaymentStep from "../components/booking/PaymentStep";
import ApprovalPendingStep from "../components/booking/ApprovalPendingStep";
import BookingAdditionalServices from "../components/booking/BookingAdditionalServices";
import BookingCustomerStep from "../components/booking/BookingCustomerStep";
import BookingFitSuccess from "../components/booking/BookingFitSuccess";
import BookingReviewStep from "../components/booking/BookingReviewStep";
import BookingServiceSelection from "../components/booking/BookingServiceSelection";
import BookingServiceSummary from "../components/booking/BookingServiceSummary";
import BookingStepper from "../components/booking/BookingStepper";
import BookingTimeSlots from "../components/booking/BookingTimeSlots";
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
  const selectedServiceViews = selectedServices.map((selectedService) => ({
    ...selectedService,
    durationLabel: formatDuration(selectedService.durationMinutes),
  }));
  const additionalServiceViews = services.filter(
    (availableService) =>
      availableService.active &&
      !selectedServices.some(
        (selectedService) => selectedService.id === availableService.id
      )
  );
  const customerContinueDisabled =
    !customerData.name.trim() ||
    !isValidWhatsApp(customerData.phone) ||
    !isValidEmail(user?.email || customerData.email) ||
    confirmingProfile ||
    customerData.reservationPolicyAccepted !== true;

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
          <BookingFitSuccess onNavigate={() => navigate("/minha-conta")} />
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
          <BookingServiceSummary service={service} />
        )}

        {step !== 5 && (
          <BookingStepper step={stepperStep} />
        )}

        {step === 1 && (
          <>
            <BookingServiceSelection
              services={selectedServiceViews}
              duration={formatDuration(totalDuration)}
              price={formatCurrency(totalPrice)}
              deposit={formatCurrency(totalDeposit)}
              onRemove={handleRemoveService}
              onOpenAdditional={() => setShowServiceSelector(true)}
            />

            <BookingAdditionalServices
              open={showServiceSelector}
              services={additionalServiceViews}
              formatDuration={formatDuration}
              onSelect={(availableService) => {
                handleAddService(availableService);
                setShowServiceSelector(false);
              }}
              onClose={() => setShowServiceSelector(false)}
            />

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
              <BookingTimeSlots
                slots={visibleTimes}
                selectedTime={selectedTime}
                disabled={!selectedTime}
                onClick={() => setStep(2)}
                onSelect={(slot) => {
                  if (slot.status === "available") {
                    setSelectedTime(slot.time);
                    setBookingType("normal");
                    return;
                  }

                  if (slot.status === "approval") {
                    setIsRequestModalOpen(true);
                  }
                }}
                onRequestFit={() => setIsRequestModalOpen(true)}
              />
            )}
          </>
        )}

        {step === 2 && (
          <BookingCustomerStep
            customerData={customerData}
            errors={errors}
            userEmail={user?.email}
            readOnly={Boolean(user)}
            showProfileConfirmation={Boolean(user && profileComplete && !editingProfile)}
            confirmingProfile={confirmingProfile}
            continueDisabled={customerContinueDisabled}
            reservationPolicyAnswered={reservationPolicyAnswered}
            reservationPolicySelected={
              reservationPolicyAnswered &&
              customerData.reservationPolicyAccepted
            }
            imagePolicy={publicSettings.policies.image_authorization?.content}
            reservationPolicy={publicSettings.policies.reservation?.content}
            onCustomerChange={handleCustomerChange}
            onContactBlur={handleContactBlur}
            onReservationChange={() => handleReservationPolicyChange(true)}
            onEditProfile={() => setEditingProfile(true)}
            onConfirmProfile={() => setEditingProfile(true)}
            onClick={() => setStep(1)}
            buttonText="Voltar"
            onContinue={handleCustomerContinue}
          />
        )}

        {step === 3 && (
          <BookingReviewStep
            services={selectedServiceViews}
            date={selectedDate?.toLocaleDateString("pt-BR")}
            time={selectedTime}
            customerData={customerData}
            totalPrice={formatCurrency(totalPrice)}
            totalDeposit={formatCurrency(totalDeposit)}
            remainingAmount={formatCurrency(remainingAmount)}
            fitRequestError={errors.fitRequest}
            bookingType={bookingType}
            loading={isSubmittingRequest}
            onClick={() => setStep(2)}
            buttonText="Voltar"
            onContinue={() =>
              bookingType === "request" ? handleBookingRequest() : setStep(4)
            }
          />
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
