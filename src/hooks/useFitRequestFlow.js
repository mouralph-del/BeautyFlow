import { useState } from "react";

function useFitRequestFlow() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [fitPreferences, setFitPreferences] = useState(null);
  const [fitRequestCompleted, setFitRequestCompleted] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const openRequestModal = () => setIsRequestModalOpen(true);
  const closeRequestModal = () => setIsRequestModalOpen(false);

  return {
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
  };
}

export default useFitRequestFlow;
