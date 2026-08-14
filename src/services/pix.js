import QRCode from "qrcode";

const PIX_CONFIG = {
  key: import.meta.env?.VITE_PIX_KEY?.trim(),
  receiverName: import.meta.env?.VITE_PIX_RECEIVER_NAME?.trim(),
  receiverCity: import.meta.env?.VITE_PIX_RECEIVER_CITY?.trim(),
};

export const sanitizePixText = (value, maxLength) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .toUpperCase()
    .slice(0, maxLength);

export const formatPixField = (id, value) => {
  const normalizedValue = String(value);

  return `${id}${String(normalizedValue.length).padStart(2, "0")}${normalizedValue}`;
};

export const calculatePixCrc16 = (value) => {
  let crc = 0xffff;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        crc & 0x8000
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export const hasValidPixCrc = (payload) => {
  if (typeof payload !== "string" || payload.length < 8) return false;
  const payloadWithoutCrc = payload.slice(0, -4);
  return payloadWithoutCrc.endsWith("6304") && calculatePixCrc16(payloadWithoutCrc) === payload.slice(-4);
};

const assertPixConfiguration = (config) => {
  const missingVariables = [];

  if (!config.key) missingVariables.push("VITE_PIX_KEY");
  if (!config.receiverName) {
    missingVariables.push("VITE_PIX_RECEIVER_NAME");
  }
  if (!config.receiverCity) {
    missingVariables.push("VITE_PIX_RECEIVER_CITY");
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Configuração Pix incompleta: ${missingVariables.join(", ")}.`
    );
  }
};

export const createPixPayment = async ({
  amount,
  transactionId = "***",
  config,
}) => {
  assertPixConfiguration(config);

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("O valor da reserva é inválido para gerar o Pix.");
  }

  const merchantAccount = [
    formatPixField("00", "BR.GOV.BCB.PIX"),
    formatPixField("01", config.key),
  ].join("");

  const additionalData = formatPixField(
    "05",
    sanitizePixText(transactionId, 25) || "***"
  );

  const payloadWithoutCrc = [
    formatPixField("00", "01"),
    formatPixField("26", merchantAccount),
    formatPixField("52", "0000"),
    formatPixField("53", "986"),
    formatPixField("54", numericAmount.toFixed(2)),
    formatPixField("58", "BR"),
    formatPixField("59", sanitizePixText(config.receiverName, 25)),
    formatPixField("60", sanitizePixText(config.receiverCity, 15)),
    formatPixField("62", additionalData),
    "6304",
  ].join("");

  const pixCopyCode = `${payloadWithoutCrc}${calculatePixCrc16(
    payloadWithoutCrc
  )}`;

  const qrCodeDataUrl = await QRCode.toDataURL(pixCopyCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: {
      dark: "#30231D",
      light: "#FFFFFF",
    },
  });

  return {
    pixKey: config.key,
    pixCopyCode,
    qrCodeDataUrl,
    amount: numericAmount,
  };
};

export const createStaticPixPayment = ({ amount, transactionId = "***" }) =>
  createPixPayment({ amount, transactionId, config: PIX_CONFIG });
