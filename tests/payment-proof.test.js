import test from "node:test";
import assert from "node:assert/strict";
import { validatePaymentProof } from "../src/utils/paymentProofValidation.js";

const file = (name, type, size = 10) => ({ name, type, size });
test("aceita PNG, JPG, JPEG e PDF compatíveis", () => {
  for (const value of [file("a.png", "image/png"), file("a.jpg", "image/jpeg"), file("a.jpeg", "image/jpeg"), file("a.pdf", "application/pdf")]) assert.equal(validatePaymentProof(value), true);
});
test("rejeita ausência de extensão, arquivo vazio, tamanho e MIME divergente", () => {
  assert.throws(() => validatePaymentProof(file("arquivo", "image/png")), /extensão/);
  assert.throws(() => validatePaymentProof(file("a.png", "image/png", 0)), /vazio/);
  assert.throws(() => validatePaymentProof(file("a.png", "image/png", 10 * 1024 * 1024 + 1)), /10 MB/);
  assert.throws(() => validatePaymentProof(file("a.pdf", "image/png")), /não corresponde/);
});
