import { supabase } from "../lib/supabase";
import { removePaymentProof, uploadPaymentProof } from "./appointments";

export const createBookingRequest = async (requestData) => {
  const { data, error } = await supabase.rpc("customer_create_fit_request", {
    payload: requestData,
  });

  if (error) {
    throw error;
  }

  return data;
};

export const respondToFitProposal = async (requestId, accepted, reason = null) => {
  const { data, error } = await supabase.rpc("customer_respond_fit_proposal", {
    target_request_id: requestId,
    accepted,
    response_reason: reason?.trim() || null,
  });
  if (error) throw error;
  if (data?.success === false) throw new Error(data.message);
  return data;
};

export const submitFitPaymentProof = async (requestId, file) => {
  let path = null;
  try {
    path = await uploadPaymentProof(file);
    const { data, error } = await supabase.rpc("customer_submit_fit_payment", {
      target_request_id: requestId,
      proof_path: path,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    await removePaymentProof(path);
    throw error;
  }
};
