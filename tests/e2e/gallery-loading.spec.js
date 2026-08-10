import { expect, test } from "@playwright/test";

const viewports = [{ width: 390, height: 844 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }];
const media = Array.from({ length: 8 }, (_, index) => ({
  id: `media-${index + 1}`, media_type: "photo", public_url: "/favicon-192x192.png",
  alt_text: `Resultado ${index + 1}`, title: `Resultado ${index + 1}`, is_active: true,
  display_order: index + 1, created_at: "2026-08-10T00:00:00Z", gallery_media_services: [],
}));

async function mockGallery(page) {
  await page.route("**/rest/v1/gallery_media*", (route) => route.fulfill({ json: media }));
  await page.route("**/rest/v1/services*", (route) => route.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_active_promotions", (route) => route.fulfill({ json: [] }));
}

async function visibleMedia(page) {
  return page.locator(".gallery-carousel__viewport .gallery-item").evaluateAll((cards) => {
    const viewport = cards[0]?.closest(".gallery-carousel__viewport")?.getBoundingClientRect();
    if (!viewport) return [];
    return cards.filter((card) => { const box = card.getBoundingClientRect(); return box.right > viewport.left && box.left < viewport.right; })
      .map((card) => ({ state: card.querySelector("[data-image-state]")?.getAttribute("data-image-state"), hasMedia: Boolean(card.querySelector("img,video")) }));
  });
}

for (const viewport of viewports) {
  test(`mídias visíveis deixam o skeleton em ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockGallery(page);
    const galleryResponse = page.waitForResponse((response) => response.url().includes("/gallery_media") && response.ok());
    await page.goto("/galeria");
    await galleryResponse;
    await expect(page.locator(".gallery-carousel__viewport [data-image-state='loaded']").first()).toBeVisible();
    await expect.poll(async () => { const items = await visibleMedia(page); return items.length > 0 && items.every((item) => item.state === "loaded" && item.hasMedia); }).toBe(true);
    await page.getByRole("button", { name: "Próximo item" }).click();
    await expect.poll(async () => (await visibleMedia(page)).every((item) => item.state === "loaded")).toBe(true);
    await page.getByRole("button", { name: "Item anterior" }).click();
    await expect.poll(async () => (await visibleMedia(page)).every((item) => item.state === "loaded")).toBe(true);
    await page.reload();
    await expect.poll(async () => { const items = await visibleMedia(page); return items.length > 0 && items.every((item) => item.state === "loaded"); }).toBe(true);
    await page.goto("/");
    await page.goBack();
    await expect.poll(async () => { const items = await visibleMedia(page); return items.length > 0 && items.every((item) => item.state === "loaded"); }).toBe(true);
  });
}
