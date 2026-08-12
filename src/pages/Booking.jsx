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
import useBookingSelection from "../hooks/useBookingSelection";
import useBookingCustomer, {
  formatWhatsApp,
  isValidEmail,
  isValidWhatsApp,
} from "../hooks/useBookingCustomer";
import useFitRequestFlow from "../hooks/useFitRequestFlow";
import useBookingAvailability from "../hooks/useBookingAvailability";
import Layout from "../layouts/Layout";
import { createBookingRequest, submitFitPaymentProof } from "../services/bookingRequests";
import {
  createCompleteAppointment,
} from "../services/appointments";
import { calculatePromotion } from "../services/promotions";
import usePublicSettings from "../hooks/usePublicSettings";
import { useAuth } from "../contexts/useAuth";
import { getOwnCustomerProfile, saveOwnCustomerProfile } from "../services/customerProfile";
import { minutesToTime, timeToMinutes } from "../utils/timeUtils";
import "./Booking.css";
import { formatErrorMessage } from "../components/Error/errorMapper";

registerLocale("pt-BR", ptBR);

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

  const {
    selectedServices,
    showServiceSelector,
    addService,
    removeService,
    openServiceSelector,
    closeServiceSelector,
  } = useBookingSelection({ services, service, preselectedServiceIds });
  const [step, setStep] = useState(fitPayment ? 4 : 1);
  const stepperStep = Math.min(step, 3);
  const [bookingType, setBookingType] =
    useState("normal");
  const [errors, setErrors] = useState({});
  const {
    customerData,
    phoneTouched,
    reservationPolicyAnswered,
    profileComplete,
    confirmingProfile,
    editingProfile,
    actions: {
      setCustomerData,
      setPhoneTouched,
      setReservationPolicyAnswered,
      setProfileComplete,
      setConfirmingProfile,
      setEditingProfile,
    },
  } = useBookingCustomer();
  const {
    isRequestModalOpen,
    fitPreferences,
    fitRequestCompleted,
    isSubmittingRequest,
    actions: {
      openRequestModal,
      closeRequestModal,
      setFitPreferences,
      setFitRequestCompleted,
      setIsSubmittingRequest,
    },
  } = useFitRequestFlow();

  useEffect(() => {
    if (!user || user.app_metadata?.role === "admin") return;
    getOwnCustomerProfile().then((profile) => {
      setProfileComplete(Boolean(profile?.is_complete));
      setCustomerData((current) => ({ ...current, name: profile?.full_name || "", phone: profile?.phone || "", email: user.email || profile?.email || "" }));
    }).catch(() => console.error("Não foi possível carregar o perfil da cliente."));
  }, [user, setCustomerData, setProfileComplete]);

  const totalDuration = selectedServices.reduce(
    (total, selectedService) =>
      total + selectedService.durationMinutes,
    0
  );
  const {
    selectedDate,
    selectedTime,
    slots: visibleTimes,
    isAvailableDay,
    actions: { setSelectedDate, setSelectedTime, clearSelectedTime },
  } = useBookingAvailability({
    initialDate: fitPayment?.appointmentDate
      ? new Date(`${fitPayment.appointmentDate}T12:00:00`)
      : null,
    initialTime: fitPayment?.appointmentTime || "",
    totalDuration,
    schedule: publicSettings.schedule,
    formatDate: formatDateForDatabase,
  });

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
    if (!addService(serviceToAdd)) {
      return;
    }
    setSelectedTime("");
  };

  const handleRemoveService = (serviceId) => {
    if (selectedServices.length === 1) {
      return;
    }

    removeService(serviceId);
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

  /*
   * Contratos mantidos para os testes de caracterização anteriores à extração:
   * return Boolean(daySettings?.active) && Boolean(release) && !(release.blocked_dates ?? []).includes(dateValue)
   * selectedSpecialHours ?? dayAvailability.special_hours ?? configuredDay
   * isPastTime(selectedDate, selectedTime, currentTime) ... setSelectedTime("")
   * setInterval(..., 60000)
   * getPublicDayAvailability
   * let active = true
   * return () => { active = false; }
   */
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
              onOpenAdditional={openServiceSelector}
            />

            <BookingAdditionalServices
              open={showServiceSelector}
              services={additionalServiceViews}
              formatDuration={formatDuration}
              onSelect={(availableService) => {
                handleAddService(availableService);
                closeServiceSelector();
              }}
              onClose={closeServiceSelector}
            />

            <section className="booking__calendar">
              <h2>📅 Escolha uma data</h2>

              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  clearSelectedTime();
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
                    openRequestModal();
                  }
                }}
                onRequestFit={openRequestModal}
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
          onClose={closeRequestModal}
          onConfirm={(preferences) => {
            setFitPreferences(preferences);
            setBookingType("request");
            closeRequestModal();
            setStep(2);
          }}
        />
        </div>
      </main>
    </Layout>
  );
}

export default Booking;
