import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import jsQR from "jsqr";
import { PNG } from "pngjs";

import { createPixPayment, hasValidPixCrc } from "../../src/services/pix.js";
import { parsePixFields } from "../helpers/pix.js";

const parseEnv = (source) => Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!match) return [];
  return [[match[1], match[2].replace(/^['"]|['"]$/g, "")]];
}));

test("configuração local gera payload e QR coerentes sem revelar a chave", async (context) => {
  let values;
  try { values = parseEnv(await readFile(new URL("../../.env", import.meta.url), "utf8")); }
  catch { context.skip(".env local não disponível"); return; }
  const config = { key: values.VITE_PIX_KEY?.trim(), receiverName: values.VITE_PIX_RECEIVER_NAME?.trim(), receiverCity: values.VITE_PIX_RECEIVER_CITY?.trim() };
  if (!config.key || !config.receiverName || !config.receiverCity) { context.skip("Configuração Pix local incompleta"); return; }

  const payment = await createPixPayment({ amount: 37.5, transactionId: "VALIDACAO", config });
  assert.equal(payment.pixKey, config.key);
  const fields = parsePixFields(payment.pixCopyCode.slice(0, -8));
  const merchant = parsePixFields(fields.get("26"));
  assert.ok(merchant.get("01") === config.key, "A chave no campo Pix deve ser exatamente a configurada");
  assert.equal(fields.get("54"), "37.50");
  assert.ok(hasValidPixCrc(payment.pixCopyCode));

  const png = PNG.sync.read(Buffer.from(payment.qrCodeDataUrl.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, "QR configurado deve ser decodificável");
  assert.ok(decoded.data === payment.pixCopyCode, "QR e Copia e Cola configurados devem ser idênticos");
});
