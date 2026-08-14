import assert from "node:assert/strict";
import test from "node:test";

import mapError from "../src/components/Error/errorMapper.js";

test("validação segura do encaixe não é mascarada", () => {
  const result = mapError({
    code: "P0001",
    message: "A agenda desta data não está liberada",
  });

  assert.equal(result.message, "A agenda desta data não está liberada");
});

test("exigência de login do encaixe não é mascarada", () => {
  const result = mapError({
    code: "P0001",
    message: "Entre na sua conta para solicitar um encaixe",
  });

  assert.equal(result.message, "Entre na sua conta para solicitar um encaixe");
});

test("erro técnico desconhecido continua sanitizado", () => {
  const result = mapError({
    code: "XX000",
    message: "internal database detail",
  });

  assert.equal(result.message, "Não foi possível concluir esta operação. Tente novamente.");
});
