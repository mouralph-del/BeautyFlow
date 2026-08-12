import { useEffect, useRef, useState } from "react";

const resolveInitialSelection = ({ services, service, preselectedServiceIds }) => {
  const requested = Array.isArray(preselectedServiceIds)
    ? services.filter((item) =>
        preselectedServiceIds.map(String).includes(String(item.id))
      )
    : [];

  return requested.length ? requested : service ? [service] : [];
};

function useBookingSelection({ services, service, preselectedServiceIds }) {
  const initializedRef = useRef(false);
  const manuallyEditedRef = useRef(false);
  const [selectedServices, setSelectedServices] = useState(() => {
    const initialSelection = resolveInitialSelection({
      services,
      service,
      preselectedServiceIds,
    });
    initializedRef.current = initialSelection.length > 0;
    return initialSelection;
  });

  useEffect(() => {
    if (!initializedRef.current && !manuallyEditedRef.current) {
      const initialSelection = resolveInitialSelection({
        services,
        service,
        preselectedServiceIds,
      });

      if (initialSelection.length > 0) {
        initializedRef.current = true;
        setSelectedServices(initialSelection);
      }

      return;
    }

    setSelectedServices((currentServices) =>
      currentServices.map(
        (currentService) =>
          services.find(
            (catalogService) =>
              String(catalogService.id) === String(currentService.id)
          ) ?? currentService
      )
    );
  }, [services, service, preselectedServiceIds]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  const addService = (serviceToAdd) => {
    const alreadySelected = selectedServices.some(
      (selectedService) => selectedService.id === serviceToAdd.id
    );

    if (alreadySelected) {
      return false;
    }

    initializedRef.current = true;
    manuallyEditedRef.current = true;
    setSelectedServices((currentServices) => [
      ...currentServices,
      serviceToAdd,
    ]);

    return true;
  };

  const removeService = (serviceId) => {
    initializedRef.current = true;
    manuallyEditedRef.current = true;
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
    showServiceSelector,
    addService,
    removeService,
    openServiceSelector,
    closeServiceSelector,
  };
}

export default useBookingSelection;
