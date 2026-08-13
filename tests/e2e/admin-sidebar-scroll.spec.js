import { expect, test } from "@playwright/test";

const mobileSizes = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
];

const largerSizes = [
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 834, height: 1194 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const createToken = (payload) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
};

async function authorizeAdmin(page) {
  await page.addInitScript(({ storageKey, session }) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(session));
  }, {
    storageKey: "sb-uckezdozxfnctorbhwfh-auth-token",
    session: {
      access_token: createToken({ exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" }),
      refresh_token: "e2e-local-refresh-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "admin@example.invalid",
        app_metadata: { role: "admin" },
        user_metadata: { name: "Administradora" },
      },
    },
  });
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("sidebar administrativo mantém todos os itens acessíveis nas alturas homologadas", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const sizes = testInfo.project.name === "chromium-mobile" ? mobileSizes : largerSizes;
  await authorizeAdmin(page);

  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/admin/sobre");
    await expect(page.getByRole("heading", { name: "Sobre o BeautyFlow" })).toBeVisible();

    const sidebar = page.locator(".admin-sidebar");
    const lastItem = sidebar.getByRole("link", { name: "Sobre o BeautyFlow" });
    const isDrawer = size.width <= 860;
    const openButton = page.getByRole("button", { name: "Abrir menu" });

    if (isDrawer) {
      await openButton.click();
      await expect(sidebar).toHaveClass(/is-open/);
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
      await expect(page.locator(".admin-sidebar__close")).toBeVisible();
    }

    await sidebar.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect(lastItem).toBeInViewport();
    await assertNoHorizontalOverflow(page);

    if (isDrawer) {
      await page.locator(".admin-sidebar__close").click();
      await expect(sidebar).not.toHaveClass(/is-open/);
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      await expect(openButton).toBeFocused();

      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.mouse.click(size.width - 2, Math.floor(size.height / 2));
      await expect(sidebar).not.toHaveClass(/is-open/);

      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.keyboard.press("Escape");
      await expect(sidebar).not.toHaveClass(/is-open/);
      await expect(openButton).toBeFocused();

      await page.getByRole("button", { name: "Abrir menu" }).click();
      await sidebar.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
      await sidebar.getByRole("link", { name: "Configurações" }).click();
      await expect(page).toHaveURL(/\/admin\/configuracoes$/);
      await expect(sidebar).not.toHaveClass(/is-open/);
    }
  }
});
