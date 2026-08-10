const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const EXTENSIONS = new Map([["png", "image/png"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["pdf", "application/pdf"]]);

export const validatePaymentProof = (file) => {
  if (!file) throw new Error("Selecione o comprovante antes de continuar.");
  const extension = file.name?.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (!extension) throw new Error("O arquivo precisa ter uma extensão PNG, JPG, JPEG ou PDF.");
  if (!TYPES.has(file.type) || !EXTENSIONS.has(extension)) throw new Error("Formato inválido. Envie o comprovante em PNG, JPG, JPEG ou PDF.");
  if (EXTENSIONS.get(extension) !== file.type) throw new Error("O tipo do arquivo não corresponde à extensão informada.");
  if (file.size === 0) throw new Error("O comprovante está vazio. Selecione outro arquivo.");
  if (file.size > MAX_BYTES) throw new Error("O comprovante deve ter no máximo 10 MB.");
  return true;
};
