import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
});

for (const [width, height] of [[320, 568], [360, 640], [375, 667], [390, 844], [414, 896], [430, 932]]) {
  test(`filtros e retrato não geram overflow em ${width}x${height}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "As dimensões são definidas explicitamente neste teste.");
    await page.setViewportSize({ width, height });
    await page.goto("/servicos");

    const filters = page.locator(".services-filters button");
    await expect(filters).toHaveCount(5);
    const boxes = await filters.evaluateAll((items) => items.map((item) => {
      const { x, y, width: itemWidth } = item.getBoundingClientRect();
      return { x, y, width: itemWidth };
    }));

    expect(boxes[0].width).toBeGreaterThan(width * 0.8);
    expect(Math.abs(boxes[1].y - boxes[2].y)).toBeLessThanOrEqual(1);
    expect(boxes[3].y).toBeGreaterThan(boxes[1].y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    await page.goto("/minha-historia");
    const portrait = page.locator(".story-portrait");
    const image = page.locator(".story-portrait img");
    await expect(portrait).toBeVisible();
    await expect(image).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
