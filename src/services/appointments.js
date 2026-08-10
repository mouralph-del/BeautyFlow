import { supabase } from "../lib/supabase";
import { validatePaymentProof } from "../utils/paymentProofValidation";

export { validatePaymentProof } from "../utils/paymentProofValidation";

const PAYMENT_PROOFS_BUCKET = "payment-proofs";

const getProofExtension = (file) => {
  const fileNameParts = file.name.split(".");

  return fileNameParts.length > 1
    ? fileNameParts.pop().toLowerCase()
    : "bin";
};

export const uploadPaymentProof = async (file) => {
  validatePaymentProof(file);
  const filePath = `${crypto.randomUUID()}.${getProofExtension(file)}`;

  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    if (error.message?.toLowerCase().includes("bucket")) {
      throw new Error(
        "O armazenamento de comprovantes ainda não foi configurado. Entre em contato com o estúdio."
      );
    }

    throw new Error(
      `Não foi possível enviar o comprovante: ${error.message}`
    );
  }

  return filePath;
};

export const removePaymentProof = async (filePath) => {
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .remove([filePath]);

  if (error) console.error("Não foi possível remover o comprovante após a falha.");
};

export const createCompleteAppointment = async ({
  appointmentData,
  appointmentServices,
  paymentProof,
}) => {
  let paymentProofPath = null;

  try {
    paymentProofPath = await uploadPaymentProof(paymentProof);

    const { data: appointment, error } = await supabase.rpc(
      "create_appointment_with_services",
      {
        appointment_data: {
          ...appointmentData,
          payment_proof: paymentProofPath,
        },
        services_data: appointmentServices,
      }
    );

    if (error) {
      if (error.code === "PGRST202") {
        throw new Error(
          "A função de criação de agendamentos ainda não foi configurada no Supabase."
        );
      }

      throw error;
    }

    return appointment;
  } catch (error) {
    await removePaymentProof(paymentProofPath);

    if (error instanceof Error) {
      throw error;
    }

    const normalizedError = new Error(
      error?.message || "Não foi possível salvar o agendamento."
    );

    normalizedError.code = error?.code;

    throw normalizedError;
  }
};

export const getBookedTimesByDate = async (date) => {
  const { data, error } = await supabase.rpc(
    "get_booked_times",
    {
      target_date: date,
    }
  );

  if (error) {
    throw error;
  }

  return data.map((appointment) => ({
    time: appointment.appointment_time.slice(0, 5),
    durationMinutes: appointment.duration_minutes,
  }));
};
