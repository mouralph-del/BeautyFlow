export const getScheduleReleaseMonths = (today = new Date()) => {
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  return {
    currentMonth,
    nextMonth,
    hasFutureDaysInCurrentMonth: tomorrow < nextMonth,
  };
};
