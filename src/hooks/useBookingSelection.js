import { useState } from "react";

function useBookingSelection({ services, service, preselectedServiceIds }) {
  const [selectedServices, setSelectedServices] = useState(() => {
    const requested = Array.isArray(preselectedServiceIds)
      ? services.filter((item) =>
          preselectedServiceIds.map(String).includes(String(item.id))
        )
      : [];

    return requested.length ? requested : service ? [service] : [];
  });
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  const addService = (serviceToAdd) => {
    const alreadySelected = selectedServices.some(
      (selectedService) => selectedService.id === serviceToAdd.id
    );

    if (alreadySelected) {
      return false;
    }

    setSelectedServices((currentServices) => [
      ...currentServices,
      serviceToAdd,
    ]);

    return true;
  };

  const removeService = (serviceId) => {
    setSelectedServices((currentServices) =>
      currentServices.filter(
        (selectedService) => selectedService.id !== serviceId
      )
    );
  };

  const openServiceSelector = () => setShowServiceSelector(true);
  const closeServiceSelector = () => setShowServiceSelector(false);

  return {
    selectedServices,
    setSelectedServices,
    showServiceSelector,
    addService,
    removeService,
    openServiceSelector,
    closeServiceSelector,
  };
}

export default useBookingSelection;
