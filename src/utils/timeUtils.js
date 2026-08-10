export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function overlapsLunch(time, duration) {
  const [hours, minutes] = time.split(":").map(Number);

  const appointmentStart = hours * 60 + minutes;
  const appointmentEnd = appointmentStart + duration;

  const lunchStart = 12 * 60;
  const lunchEnd = 13 * 60 + 30;

  return appointmentStart < lunchEnd && appointmentEnd > lunchStart;
}

export function getTimeStatus({
  time,
  duration,
  closingTime,
  bookedTimes = [],
}) {
  const [hours, minutes] = time.split(":").map(Number);
  const [closingHours, closingMinutes] = closingTime
    .split(":")
    .map(Number);

  const start = hours * 60 + minutes;
  const end = start + duration;

  const lunchStart = 12 * 60;
  const lunchEnd = 13 * 60 + 30;

  const closing =
    closingHours * 60 + closingMinutes;

  if (start >= lunchStart && start < lunchEnd) {
    return "hidden";
  }

  if (start < lunchStart && end > lunchStart) {
    return end - lunchStart <= 15 ? "approval" : "hidden";
  }

  if (end > closing) {
    return end - closing <= 15 ? "approval" : "hidden";
  }

  // Aparece como indisponível porque já foi reservado
  if (bookedTimes.includes(time)) {
    return "unavailable";
  }

  return "available";
}

export function hasConflict(
  startTime,
  durationMinutes,
  bookedAppointments
) {
  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;

  return bookedAppointments.some((appointment) => {
    const bookedStart = timeToMinutes(appointment.time);
    const bookedEnd =
      bookedStart + appointment.durationMinutes;

    return start < bookedEnd && end > bookedStart;
  });
}

export function getBusinessHours(date) {
  const dayOfWeek = date.getDay();

  // Domingo ou quinta-feira
  if (dayOfWeek === 0 || dayOfWeek === 4) {
    return null;
  }

  // Sábado
  if (dayOfWeek === 6) {
    return {
      opening: timeToMinutes("08:00"),
      breakStart: timeToMinutes("12:00"),
      breakEnd: timeToMinutes("13:00"),
      closing: timeToMinutes("15:00"),
    };
  }

  // Segunda, terça, quarta e sexta
  return {
    opening: timeToMinutes("08:00"),
    breakStart: timeToMinutes("12:00"),
    breakEnd: timeToMinutes("13:30"),
    closing: timeToMinutes("18:00"),
  };
}

export function fitsBusinessHours(
  startTime,
  durationMinutes,
  selectedDate
) {
  if (!selectedDate) {
    return false;
  }

  const businessHours = getBusinessHours(selectedDate);

  if (!businessHours) {
    return false;
  }

  if (overlapsLunch(startTime, durationMinutes)) {
    return false;
  }

  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;

  const fitsMorning =
    start >= businessHours.opening &&
    end <= businessHours.breakStart;

  const fitsAfternoon =
    start >= businessHours.breakEnd &&
    end <= businessHours.closing;

  return fitsMorning || fitsAfternoon;
}

export function isTimeAvailable({
  startTime,
  durationMinutes,
  selectedDate,
  bookedAppointments,
}) {
  const fitsSchedule = fitsBusinessHours(
    startTime,
    durationMinutes,
    selectedDate
  );

  if (!fitsSchedule) {
    return false;
  }

  return !hasConflict(
    startTime,
    durationMinutes,
    bookedAppointments
  );
}

export function getTimeSlotStatus({
  startTime,
  durationMinutes,
  selectedDate,
  bookedAppointments,
  scheduleOverride,
  blockedIntervals = [],
}) {
  if (!selectedDate) {
    return "hidden";
  }

  const opening = scheduleOverride?.opening ?? scheduleOverride?.open;
  const closing = scheduleOverride?.closing ?? scheduleOverride?.close;
  const breakStart = scheduleOverride?.breakStart ?? scheduleOverride?.break_start;
  const breakEnd = scheduleOverride?.breakEnd ?? scheduleOverride?.break_end;
  const businessHours = scheduleOverride
    ? {
        opening: timeToMinutes(opening),
        breakStart: breakStart ? timeToMinutes(breakStart) : null,
        breakEnd: breakEnd ? timeToMinutes(breakEnd) : null,
        closing: timeToMinutes(closing),
      }
    : getBusinessHours(selectedDate);

  if (!businessHours) {
    return "hidden";
  }

  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;
  const hasBreak = Number.isFinite(businessHours.breakStart) && Number.isFinite(businessHours.breakEnd);
  const fitsMorning = hasBreak && start >= businessHours.opening && end <= businessHours.breakStart;
  const fitsAfternoon = hasBreak
    ? start >= businessHours.breakEnd && end <= businessHours.closing
    : start >= businessHours.opening && end <= businessHours.closing;
  const morningApproval = hasBreak && start < businessHours.breakStart && end > businessHours.breakStart && end <= businessHours.breakStart + 15;
  const closingApproval = start < businessHours.closing && end > businessHours.closing && end <= businessHours.closing + 15;

  if (!fitsMorning && !fitsAfternoon && !morningApproval && !closingApproval) return "hidden";

  if (
    hasConflict(
      startTime,
      durationMinutes,
      bookedAppointments
    )
  ) {
    return "unavailable";
  }

  const conflictsWithBlock = blockedIntervals.some((block) => {
    const blockStart = timeToMinutes(block.start);
    const blockEnd = timeToMinutes(block.end);
    return start < blockEnd && end > blockStart;
  });
  if (conflictsWithBlock) return "unavailable";

  return morningApproval || closingApproval ? "approval" : "available";
}
