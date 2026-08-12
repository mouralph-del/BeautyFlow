import { useState } from "react";

export const formatWhatsApp = (value) => {
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

export const isValidWhatsApp = (value) =>
  /^\(\d{2}\) \d{5}-\d{4}$/.test(value);

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function useBookingCustomer() {
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

  return {
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
  };
}

export default useBookingCustomer;
