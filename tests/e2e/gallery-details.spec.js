import { expect, test } from "@playwright/test";

const sizes = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

async function mockCatalog(page) {
  await page.route("**/rest/v1/rpc/get_active_promotions", (route) => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/services*", (route) => route.fulfill({ json: [{ id: "service-db-2", legacy_id: 2, slug: "design-com-henna", name: "Design com Henna", category: "Sobrancelhas", short_description: "Realça o formato e preenche visualmente pequenas falhas.", full_description: "Descrição real do serviço para o modal.", duration_label: "50 minutos", duration_minutes: 50, price: 45, reservation_amount: 15, is_active: true, is_featured: false, display_order: 1 }] }));
  await page.route("**/rest/v1/gallery_media*", (route) => route.fulfill({ json: [
    { id: "linked", media_type: "photo", public_url: "/favicon-192x192.png", alt_text: "Resultado com henna", title: "Resultado", title_source: "service", gallery_media_services: [{ service_id: "service-db-2", display_order: 0, is_primary: true }], is_active: true, display_order: 1, created_at: "2026-08-09T00:00:00Z" },
    { id: "unlinked", media_type: "photo", public_url: null, alt_text: "Resultado sem vínculo", title: "Resultado", service_id: null, is_active: true, display_order: 2, created_at: "2026-08-09T00:00:00Z" },
  ] }));
}

async function mockMultipleServices(page) {
  await page.route("**/rest/v1/rpc/get_active_promotions", (route) => route.fulfill({ json: [{ id: "promo-1", status: "active", discount_type: "percentage", discount_value: 20, service_ids: ["service-db-1"] }] }));
  await page.route("**/rest/v1/services*", (route) => route.fulfill({ json: [
    { id: "service-db-1", legacy_id: 1, slug: "design-personalizado", name: "Design Personalizado", category: "Sobrancelhas", full_description: "Descrição principal do catálogo.", duration_label: "40 minutos", duration_minutes: 40, price: 30, reservation_amount: 10, is_active: true, display_order: 1 },
    { id: "service-db-2", legacy_id: 2, slug: "design-com-henna", name: "Design com Henna", category: "Sobrancelhas", full_description: "Descrição do segundo serviço.", duration_label: "50 minutos", duration_minutes: 50, price: 45, reservation_amount: 15, is_active: true, display_order: 2 },
  ] }));
  await page.route("**/rest/v1/gallery_media*", (route) => route.fulfill({ json: [{ id: "multiple", media_type: "photo", public_url: "/favicon-192x192.png", alt_text: "Resultado combinado", title: "Título interno", title_source: "custom", custom_title: "Transformação do olhar", description_source: "custom", custom_description: "Descrição exclusiva desta foto.", gallery_media_services: [{ service_id: "service-db-1", display_order: 0, is_primary: true }, { service_id: "service-db-2", display_order: 1, is_primary: false }], is_active: true, display_order: 1 }] }));
}

for (const viewport of sizes) {
  test(`detalhes da galeria são responsivos em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockCatalog(page);
    await page.goto("/galeria");
    const trigger = page.getByRole("button", { name: /Ver detalhes de Resultado com henna/i }).nth(1);
    await expect(trigger).toBeVisible();
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Design com Henna" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Descrição real do serviço para o modal.");
    await expect(dialog).toContainText("50 minutos");
    await expect(dialog).toContainText("R$ 45,00");
    await expect(dialog.getByRole("img", { name: "Resultado com henna" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    if (viewport.width <= 700) await expect(dialog.locator(".gallery-details-modal__layout")).toHaveCSS("flex-direction", "column");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test("resultado sem serviço omite dados comerciais e agendamento", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/galeria");
  await page.getByRole("button", { name: /Ver detalhes de Resultado sem vínculo/i }).nth(1).click();
  const dialog = page.getByRole("dialog", { name: "Resultado" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Um resultado realizado com o cuidado");
  await expect(dialog.getByText("R$ 0,00")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Agendar este serviço" })).toHaveCount(0);
  await expect(dialog.getByText("Imagem não disponível")).toBeVisible();
});

test("agendar usa o fluxo existente do serviço", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/galeria");
  await page.getByRole("button", { name: /Ver detalhes de Resultado com henna/i }).nth(1).click();
  await page.getByRole("button", { name: "Agendar este serviço" }).click();
  await expect(page).toHaveURL(/\/agendamento\/2$/);
});

test("múltiplos serviços preservam catálogo, promoção e escolhas de agendamento", async ({ page }) => {
  await mockMultipleServices(page);
  await page.goto("/galeria");
  await page.getByRole("button", { name: /Ver detalhes de Resultado combinado/i }).nth(1).click();
  const dialog = page.getByRole("dialog", { name: "Transformação do olhar" });
  await expect(dialog).toContainText("Descrição exclusiva desta foto.");
  await expect(dialog).toContainText("Serviços realizados");
  await expect(dialog).toContainText("🔥 Em promoção");
  await expect(dialog).toContainText("R$ 30,00");
  await expect(dialog).toContainText("R$ 24,00");
  await expect(dialog).toContainText("Economia de R$ 6,00");
  await expect(dialog.locator(".gallery-details-modal__service-benefits li")).not.toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Agendar todos" })).toBeVisible();
  await dialog.getByRole("button", { name: "Agendar somente Design com Henna" }).click();
  await expect(page).toHaveURL(/\/agendamento\/2$/);
});
