import { useEffect, useState } from "react";
import { formatErrorMessage } from "../Error/errorMapper";

import "./PaymentStep.css";
import { createStaticPixPayment } from "../../services/pix";
import { validatePaymentProof } from "../../services/appointments";
import usePublicSettings from "../../hooks/usePublicSettings";

function PaymentStep({
  bookingData,
  onFinish,
}) {
  const { studio } = usePublicSettings();
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pixPayment, setPixPayment] = useState(null);
  const [pixError, setPixError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let active = true;

    createStaticPixPayment({
      amount: bookingData.totalDeposit,
    })
      .then((payment) => {
        if (active) {
          setPixPayment(payment);
          setPixError("");
        }
      })
        .catch((error) => {
        if (active) {
          setPixPayment(null);
          setPixError(formatErrorMessage(error) || "Não foi possível gerar o pagamento Pix.");
        }
      });

    return () => {
      active = false;
    };
  }, [bookingData.totalDeposit]);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const formatCurrency = (value) => {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleCopyPix = async () => {
    if (!pixPayment?.pixCopyCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pixPayment.pixCopyCode);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      console.error("Não foi possível copiar o código Pix.");
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      try {
        validatePaymentProof(file);
        setSelectedFile(file);
        setFileError("");
        } catch (error) {
        setSelectedFile(null);
        setFileError(formatErrorMessage(error) || "Arquivo inválido");
        event.target.value = "";
      }
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedFile) {
      setFileError("Selecione o comprovante antes de continuar.");
      return;
    }

    setFileError("");
    setIsSending(true);

    try {
      await onFinish(selectedFile);
    } catch (error) {
      console.error("Não foi possível enviar o comprovante.");
      setFileError(formatErrorMessage(error) || "Não foi possível confirmar o agendamento. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="payment-step">
      <div className="payment-header">
        <h2>Pagamento da taxa de reserva</h2>

        <p>
          Para confirmar seu horário, realize o pagamento da taxa de reserva
          através do Pix.
        </p>
      </div>

      <div className="payment-content">
        <div className="payment-card payment-summary">
          <h3>Resumo da Reserva</h3>

          <div className="summary-main-info">
            <div className="payment-services-list">
              {bookingData.selectedServices.map((selectedService) => (
                <p key={selectedService.id}>
                  ✨ {selectedService.title}
                </p>
              ))}
            </div>
            <p>
              📅 {bookingData.selectedDate?.toLocaleDateString("pt-BR")}
            </p>
            <p>🕒 {bookingData.selectedTime}</p>
            <p>📍 {studio.neighborhood} • {studio.city}/{studio.state}</p>
          </div>

          <div className="payment-values">
            <div className="payment-value-row">
              <span>Valor do serviço</span>
              <strong>{formatCurrency(bookingData.totalPrice)}</strong>
            </div>

            <div className="payment-value-row">
              <span>Reserva via Pix</span>
              <strong>{formatCurrency(bookingData.totalDeposit)}</strong>
            </div>

            <div className="payment-value-row payment-value-row--highlight">
              <span>Restante no atendimento</span>
              <strong>{formatCurrency(bookingData.remainingAmount)}</strong>
            </div>
          </div>

        </div>

        <div className="payment-card payment-pix">
          <h3>Pagamento via Pix</h3>

          <p className="pix-description">
            Escaneie o QR Code ou copie o código Pix para realizar o pagamento
            da reserva.
          </p>

          <div className="pix-qrcode">
            {pixPayment?.qrCodeDataUrl && (
              <img src={pixPayment.qrCodeDataUrl} alt="QR Code Pix" />
            )}

            {!pixPayment && !pixError && <span>Gerando QR Code...</span>}
          </div>

          {pixError && <p className="payment-pix-error">{pixError}</p>}

          <button
            type="button"
            className={`copy-pix-button ${copied ? "copied" : ""}`}
            onClick={handleCopyPix}
            disabled={!pixPayment}
          >
            {copied ? "Código copiado com sucesso" : "Copiar código Pix"}
          </button>

          <p className="payment-instruction">
            Após realizar o pagamento, envie o comprovante para concluir sua
            solicitação de agendamento.
          </p>

          <div className="pix-code pix-code--visible">
            <label htmlFor="pix-copy-code">
              Pix Copia e Cola
            </label>

            <textarea
              id="pix-copy-code"
              readOnly
              value={pixPayment?.pixCopyCode ?? ""}
            />
          </div>

          <div className="upload-area">
            <label htmlFor="payment-proof" className="upload-box">
              <span className="upload-icon">📄</span>

              <h4>Selecionar comprovante</h4>

              <p>
                Clique para anexar o comprovante do pagamento via Pix.
              </p>

              <small>
                PNG • JPG • JPEG • PDF
              </small>

              {selectedFile && (
                <div className="selected-file">
                  {selectedFile.name}
                </div>
              )}

              {previewUrl && (
                <img
                  className="payment-proof-preview"
                  src={previewUrl}
                  alt="Pré-visualização do comprovante"
                />
              )}
            </label>

            <input
              id="payment-proof"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleFileChange}
              hidden
            />
          </div>

          {fileError && (
            <p className="payment-file-error">
              {fileError}
            </p>
          )}

          <button
            type="button"
            className="payment-button"
            onClick={handleSubmitProof}
            disabled={isSending || !pixPayment}
          >
            {isSending
              ? "Enviando comprovante..."
              : "Enviar comprovante"}
          </button>
        </div>
      </div>

    </section>
  );
}

export default PaymentStep;
