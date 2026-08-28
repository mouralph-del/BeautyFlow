import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const selection = readFileSync("src/components/booking/BookingServiceSelection.jsx", "utf8");
const additional = readFileSync("src/components/booking/BookingAdditionalServices.jsx", "utf8");
const css = readFileSync("src/pages/Booking.css", "utf8");

test("seletor adicional é renderizado dentro do card principal", () => {
  assert.match(
    booking,
    /<BookingServiceSelection[\s\S]*>\s*<BookingAdditionalServices[\s\S]*<\/BookingServiceSelection>/
  );
  assert.match(selection, /\{children\}/);
});

test("não existe segundo card externo para serviços adicionais", () => {
  assert.doesNotMatch(css, /\.selected-services,\s*[\r\n]+\.additional-services\s*\{/);
  assert.match(css, /\.selected-services\s*\{[\s\S]*border:\s*1px solid #e8ded3/);
  assert.match(css, /\.additional-services\s*\{[\s\S]*border-top:\s*1px solid #eee3da/);
});

test("área adicional permanece fechada por padrão e recolhe sem alterar seleção", () => {
  assert.match(additional, /if \(!open\) \{\s*return null;\s*\}/);
  assert.match(additional, /onClose/);
  assert.doesNotMatch(additional, /onRemove|setSelectedServices|handleRemoveService/);
});

test("seleção adicional continua adicionando uma vez e fecha o painel interno", () => {
  assert.match(
    booking,
    /onSelect=\{\(availableService\) => \{[\s\S]*handleAddService\(availableService\);[\s\S]*closeServiceSelector\(\);[\s\S]*\}\}/
  );
});

test("botões de adicionar e fechar reutilizam o hover do botão Voltar", () => {
  assert.match(css, /\.booking-back:hover\s*\{[\s\S]*background:\s*var\(--color-primary, #9a6543\)/);
  assert.match(css, /\.add-service-button:hover,[\s\S]*\.additional-services__header button:focus-visible\s*\{[\s\S]*background:\s*var\(--color-primary, #9a6543\)/);
  assert.match(css, /box-shadow:\s*0 0 0 3px rgba\(154, 101, 67, 0\.22\)/);
});

test("grid interno preserva responsividade sem mudar a regra de serviços", () => {
  assert.match(css, /\.additional-services__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.additional-services__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.additional-services__grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(booking, /additionalServiceViews/);
});
