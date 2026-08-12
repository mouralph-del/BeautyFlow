import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const booking = readFileSync("src/pages/Booking.jsx", "utf8");
const selectionHook = readFileSync("src/hooks/useBookingSelection.js", "utf8");
const services = [
  { id: 1, title: "Serviço A", durationMinutes: 60, price: "R$ 100,00", reservationFee: "R$ 20,00" },
  { id: 2, title: "Serviço B", durationMinutes: 45, price: "R$ 80,00", reservationFee: "R$ 15,00" },
];
const currency = (value) => Number(String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
const initialize = ({ catalog, routeId, preselected }) => {
  const service = catalog.find((item) => item.id === Number(routeId));
  const requested = Array.isArray(preselected) ? catalog.filter((item) => preselected.map(String).includes(String(item.id))) : [];
  return requested.length ? requested : service ? [service] : [];
};
const totals = (selected) => ({
  duration: selected.reduce((sum, item) => sum + item.durationMinutes, 0),
  price: selected.reduce((sum, item) => sum + currency(item.price), 0),
  deposit: selected.reduce((sum, item) => sum + currency(item.reservationFee), 0),
});
const createSelectionModel = ({ routeId, preselected }) => {
  let selected = [];
  let initialized = false;
  let manuallyEdited = false;

  const sync = (catalog) => {
    if (!initialized && !manuallyEdited) {
      const initial = initialize({ catalog, routeId, preselected });
      if (initial.length) {
        selected = initial;
        initialized = true;
      }
      return;
    }
    selected = selected.map(
      (item) => catalog.find((catalogItem) => String(catalogItem.id) === String(item.id)) ?? item
    );
  };

  return {
    sync,
    add: (item) => {
      initialized = true;
      manuallyEdited = true;
      if (!selected.some((current) => current.id === item.id)) selected = [...selected, item];
    },
    remove: (id) => {
      initialized = true;
      manuallyEdited = true;
      selected = selected.filter((item) => item.id !== id);
    },
    selected: () => selected,
  };
};

test("serviço único inicia sozinho na etapa 1", () => {
  const selected = initialize({ catalog: services, routeId: 1 });
  assert.deepEqual(selected.map((item) => item.id), [1]);
  assert.deepEqual(totals(selected), { duration: 60, price: 100, deposit: 20 });
  assert.match(booking, /useState\(fitPayment \? 4 : 1\)/);
});

test("múltiplos IDs válidos preservam a ordem do catálogo e somam totais", () => {
  const selected = initialize({ catalog: services, routeId: 1, preselected: [2, 1] });
  assert.deepEqual(selected.map((item) => item.id), [1, 2]);
  assert.deepEqual(totals(selected), { duration: 105, price: 180, deposit: 35 });
});

test("IDs inválidos são ignorados sem quebrar a seleção válida", () => {
  assert.deepEqual(initialize({ catalog: services, routeId: 1, preselected: [999, 2] }).map((item) => item.id), [2]);
});

test("sem ID pré-selecionado válido o serviço da rota é o fallback", () => {
  assert.deepEqual(initialize({ catalog: services, routeId: 1, preselected: [999] }).map((item) => item.id), [1]);
});

test("alterar serviços limpa o horário selecionado", () => {
  const add = booking.slice(booking.indexOf("const handleAddService"), booking.indexOf("const handleRemoveService"));
  const remove = booking.slice(booking.indexOf("const handleRemoveService"), booking.indexOf("const handleCustomerChange"));
  assert.match(add, /setSelectedTime\(""\)/);
  assert.match(remove, /setSelectedTime\(""\)/);
});

test("não é permitido remover o último serviço", () => {
  assert.match(booking, /if \(selectedServices\.length === 1\) \{\s*return;/);
});

test("catálogo tardio inicializa o serviço da rota uma única vez", () => {
  const model = createSelectionModel({ routeId: 1 });
  model.sync([]);
  assert.deepEqual(model.selected(), []);
  model.sync(services);
  model.sync(services);
  assert.deepEqual(model.selected().map((item) => item.id), [1]);
  assert.match(selectionHook, /initializedRef/);
});

test("catálogo tardio preserva múltiplos IDs válidos e ignora inexistentes", () => {
  const model = createSelectionModel({ routeId: 1, preselected: [2, 999, 1] });
  model.sync([]);
  model.sync(services);
  assert.deepEqual(model.selected().map((item) => item.id), [1, 2]);
});

test("serviço removido manualmente não reaparece após atualização do catálogo", () => {
  const model = createSelectionModel({ routeId: 1, preselected: [1, 2] });
  model.sync(services);
  model.remove(2);
  model.sync(services.map((item) => ({ ...item, title: `${item.title} atualizado` })));
  assert.deepEqual(model.selected().map((item) => item.id), [1]);
});

test("serviço adicionado manualmente permanece após nova sincronização", () => {
  const model = createSelectionModel({ routeId: 1 });
  model.sync(services);
  model.add(services[1]);
  model.sync(services);
  assert.deepEqual(model.selected().map((item) => item.id), [1, 2]);
});

test("catálogo atualizado renova dados sem recriar seleção removida", () => {
  const model = createSelectionModel({ routeId: 1, preselected: [1, 2] });
  model.sync(services);
  model.remove(2);
  model.sync([{ ...services[0], title: "Serviço A novo", durationMinutes: 75, price: "R$ 120,00" }, services[1]]);
  assert.deepEqual(model.selected(), [{ ...services[0], title: "Serviço A novo", durationMinutes: 75, price: "R$ 120,00" }]);
});
