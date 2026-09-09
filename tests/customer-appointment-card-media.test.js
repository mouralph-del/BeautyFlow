import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getAppointmentImage } from "../src/utils/customerAppointments.js";

test("uses the first service image for an appointment with multiple services", () => {
  const image = getAppointmentImage({
    services: [
      { name: "Serviço principal", image_url: "https://example.test/principal.jpg" },
      { name: "Outro serviço", image_url: "https://example.test/other.jpg" },
    ],
  });

  assert.equal(image, "https://example.test/principal.jpg");
});

test("returns no image when the appointment has no valid media source", () => {
  assert.equal(getAppointmentImage({ services: [], serviceName: "Serviço sem imagem" }), null);
});

test("does not render a beige media placeholder when no image is available", async () => {
  const component = await readFile(new URL("../src/components/CustomerSpace/CustomerAppointmentCard.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(component, /background:\s*["']#f5efe9["']/);
  assert.match(component, /if \(!src \|\| failedToLoad\) return null/);
  assert.match(component, /onError=\{\(\) => setFailedToLoad\(true\)\}/);
});

test("keeps service media contained and responsive in customer appointment cards", async () => {
  const css = await readFile(new URL("../src/pages/CustomerAccount.css", import.meta.url), "utf8");

  assert.match(css, /customer-appointment-card__image[^}]*height:180px[^}]*object-fit:cover/);
  assert.match(css, /@media\(max-width:850px\)\{[\s\S]*?customer-appointments-grid\{grid-template-columns:1fr 1fr/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?customer-appointments-grid\{grid-template-columns:1fr/);
});
