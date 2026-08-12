import { useEffect, useState } from "react";
import { getBookedTimesByDate } from "../services/appointments";
import { getReleasedSchedules } from "../services/monthlySchedule";
import { getPublicDayAvailability } from "../services/settings";
import { getTimeSlotStatus, timeToMinutes } from "../utils/timeUtils";

const EMPTY_DAY_AVAILABILITY = { special_hours: null, blocks: [] };

const createAppointmentDateTime = (selectedDate, time) => {
  if (!selectedDate || !time) return null;

  const date = new Date(selectedDate);
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const isPastTime = (selectedDate, time, currentTime) => {
  const appointmentDateTime = createAppointmentDateTime(selectedDate, time);
  return appointmentDateTime ? appointmentDateTime <= currentTime : false;
};

function useBookingAvailability({
  initialDate,
  initialTime,
  totalDuration,
  schedule,
  formatDate,
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [releasedSchedules, setReleasedSchedules] = useState([]);
  const [dayAvailability, setDayAvailability] = useState(EMPTY_DAY_AVAILABILITY);

  useEffect(() => {
    getReleasedSchedules()
      .then(setReleasedSchedules)
      .catch(() => {
        console.error("Não foi possível consultar os meses liberados.");
        setReleasedSchedules([]);
      });
  }, []);

  const selectedRelease = selectedDate
    ? releasedSchedules.find((item) => item.year === selectedDate.getFullYear() && item.month === selectedDate.getMonth() + 1)
    : null;
  const selectedSpecialHours = selectedDate
    ? selectedRelease?.special_hours?.[formatDate(selectedDate)]
    : null;
  const configuredDay = selectedDate
    ? schedule.days?.[String(selectedDate.getDay())]
    : null;
  const activeSchedule = selectedSpecialHours ?? dayAvailability.special_hours ?? configuredDay;

  const isAvailableDay = (date) => {
    const dateValue = formatDate(date);
    const release = releasedSchedules.find(
      (item) => item.year === date.getFullYear() && item.month === date.getMonth() + 1
    );

    const daySettings = schedule.days?.[String(date.getDay())];
    return Boolean(daySettings?.active) && Boolean(release) && !(release.blocked_dates ?? []).includes(dateValue);
  };

  const generateTimeSlots = () => {
    if (!selectedDate) return [];

    const times = [];
    if (!activeSchedule?.active && !selectedSpecialHours && !dayAvailability.special_hours) return [];
    let currentMinutes = timeToMinutes(activeSchedule.opening ?? activeSchedule.open);
    const endMinutes = timeToMinutes(activeSchedule.closing ?? activeSchedule.close);

    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      times.push(formattedTime);
      currentMinutes += Number(schedule.slot_interval) || 30;
    }

    return times;
  };

  const slots = generateTimeSlots()
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
      status: slot.status !== "hidden" && isPastTime(selectedDate, slot.time, currentTime)
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
    if (selectedTime && isPastTime(selectedDate, selectedTime, currentTime)) {
      setSelectedTime("");
    }
  }, [currentTime, selectedDate, selectedTime]);

  useEffect(() => {
    if (!selectedDate) {
      setDayAvailability(EMPTY_DAY_AVAILABILITY);
      return;
    }
    let active = true;
    getPublicDayAvailability(formatDate(selectedDate))
      .then((value) => active && setDayAvailability(value))
      .catch(() => {
        console.error("Não foi possível consultar as exceções da agenda.");
        if (active) setDayAvailability(EMPTY_DAY_AVAILABILITY);
      });
    return () => { active = false; };
  }, [selectedDate, formatDate]);

  useEffect(() => {
    let active = true;
    const fetchBookedTimes = async () => {
      if (!selectedDate) {
        setBookedAppointments([]);
        return;
      }

      const formattedDate = formatDate(selectedDate);
      try {
        const appointments = await getBookedTimesByDate(formattedDate);
        if (active) setBookedAppointments(appointments);
      } catch {
        if (active) {
          console.error("Não foi possível buscar os horários ocupados.");
          setBookedAppointments([]);
        }
      }
    };

    fetchBookedTimes();
    return () => { active = false; };
  }, [selectedDate, formatDate]);

  return {
    selectedDate,
    selectedTime,
    currentTime,
    bookedAppointments,
    releasedSchedules,
    dayAvailability,
    slots,
    isAvailableDay,
    actions: {
      setSelectedDate,
      setSelectedTime,
      clearSelectedTime: () => setSelectedTime(""),
    },
  };
}

export default useBookingAvailability;
