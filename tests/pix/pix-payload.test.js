import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import jsQR from "jsqr";
import { PNG } from "pngjs";

import { createPixPayment, hasValidPixCrc, sanitizePixText } from "../../src/services/pix.js";
import { maskPixKey, parsePixFields } from "../helpers/pix.js";

const TEST_CONFIG = {
  key: "123e4567-e89b-12d3-a456-426614174000",
  receiverName: "THAIS TESTE",
  receiverCity: "SAO PAULO",
};
const TEST_AMOUNT = 37.5;

const createPayment = () => createPixPayment({ amount: TEST_AMOUNT, transactionId: "TESTE-123", config: TEST_CONFIG });

test("gera BR Code Pix com chave, titular, cidade, valor e TXID configurados", async () => {
  const payment = await createPayment();
  assert.ok(payment.pixCopyCode.startsWith("000201"));
  assert.equal(payment.amount, TEST_AMOUNT);
  assert.ok(hasValidPixCrc(payment.pixCopyCode));

  const fields = parsePixFields(payment.pixCopyCode.slice(0, -8));
  const merchant = parsePixFields(fields.get("26"));
  const additional = parsePixFields(fields.get("62"));
  assert.equal(merchant.get("00"), "BR.GOV.BCB.PIX");
  assert.equal(merchant.get("01"), TEST_CONFIG.key);
  assert.equal(fields.get("54"), "37.50");
  assert.equal(fields.get("59"), TEST_CONFIG.receiverName);
  assert.equal(fields.get("60"), TEST_CONFIG.receiverCity);
  assert.equal(additional.get("05"), "TESTE-123");
  assert.match(maskPixKey(merchant.get("01")), /^\*+4000$/);
});

test("QR Code decodifica exatamente para o Pix Copia e Cola", async () => {
  const payment = await createPayment();
  const png = PNG.sync.read(Buffer.from(payment.qrCodeDataUrl.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, "QR Code deve ser decodificável");
  assert.equal(decoded.data, payment.pixCopyCode);
  assert.ok(hasValidPixCrc(decoded.data));
});

test("qualquer alteração no conteúdo invalida o CRC", async () => {
  const { pixCopyCode } = await createPayment();
  const index = pixCopyCode.indexOf("37.50");
  const changed = `${pixCopyCode.slice(0, index)}38.50${pixCopyCode.slice(index + 5)}`;
  assert.equal(hasValidPixCrc(changed), false);
});

test("normaliza caracteres especiais e limita campos EMV", () => {
  assert.equal(sanitizePixText("Thaís & Cílios!", 25), "THAIS  CILIOS");
  assert.equal(sanitizePixText("São João Clímaco", 8), "SAO JOAO");
});

for (const invalid of [0, -1, NaN, Infinity, "inválido"]) {
  test(`bloqueia valor inválido: ${String(invalid)}`, async () => {
    await assert.rejects(() => createPixPayment({ amount: invalid, config: TEST_CONFIG }), /inválido/);
  });
}

test("não existe imagem estática de QR Code Pix importada no frontend", async () => {
  const srcRoot = fileURLToPath(new URL("../../src", import.meta.url));
  const pending = [srcRoot];
  const files = [];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) pending.push(path);
      else if (/\.(js|jsx|ts|tsx)$/i.test(entry.name)) files.push(path);
    }
  }
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /pix[-_]?qrcode\.(png|jpe?g|webp)/i);
  }
});
