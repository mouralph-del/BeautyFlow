import { expect, test } from "@playwright/test";

const mobileSizes = [
  { width: 320, height: 568 }, { width: 360, height: 640 },
  { width: 375, height: 667 }, { width: 390, height: 844 },
  { width: 414, height: 896 }, { width: 430, height: 932 },
];
const largerSizes = [
  { width: 768, height: 1024 }, { width: 820, height: 1180 },
  { width: 834, height: 1194 }, { width: 1024, height: 768 },
  { width: 1280, height: 720 }, { width: 1366, height: 768 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];

const createToken = (payload) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
};

async function authorizeCustomer(page) {
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
        id: "00000000-0000-4000-8000-000000000002",
        email: "customer@example.invalid",
        app_metadata: { role: "customer" },
        user_metadata: { name: "Cliente Teste" },
      },
    },
  });
}

const noOverflow = (page) => page.evaluate(() => ({
  horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  viewportWidth: window.visualViewport?.width ?? window.innerWidth,
  scale: window.visualViewport?.scale ?? 1,
}));

test("header e navegação da cliente permanecem estáveis nas resoluções homologadas", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await authorizeCustomer(page);
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  const sizes = testInfo.project.name === "chromium-mobile" ? mobileSizes : largerSizes;

  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto("/contato");
    const header = page.locator(".header");
    const logo = page.locator(".header-brand__logo");
    await expect(header).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menu da cliente" })).toBeVisible();
    await expect(logo).toBeVisible();
    await expect(logo).toContainText("Beauty Studio");

    const geometry = await page.evaluate(() => {
      const headerBox = document.querySelector(".header")?.getBoundingClientRect();
      const logoBox = document.querySelector(".header-brand__logo")?.getBoundingClientRect();
      return { headerBottom: headerBox?.bottom ?? 0, logoBottom: logoBox?.bottom ?? 0 };
    });
    expect(geometry.logoBottom).toBeLessThanOrEqual(geometry.headerBottom + 1);

    const state = await noOverflow(page);
    expect(state.horizontal).toBeLessThanOrEqual(1);
    expect(state.viewportWidth).toBeLessThanOrEqual(size.width + 1);
    expect(state.scale).toBe(1);

    if (size.width <= 650) {
      await expect(page.getByRole("button", { name: "Abrir menu", exact: true })).toHaveCount(0);
      const account = page.getByRole("button", { name: "Abrir menu da cliente" });
      await account.click();
      const drawer = page.getByRole("dialog", { name: "Cliente Teste" });
      await expect(drawer).toBeVisible();
      for (const name of ["Meu Espaço", "Meus Agendamentos", "Configurações", "Início", "Serviços", "Minha História", "Galeria", "Contato", "Sair"]) {
        await expect(drawer.getByText(name, { exact: true })).toBeAttached();
      }
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
      await drawer.getByRole("link", { name: "Contato" }).click();
      await expect(drawer).toBeHidden();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      expect((await noOverflow(page)).horizontal).toBeLessThanOrEqual(1);
    }
  }
});

test("foco mobile preserva escala e logout continua funcional", async ({ page }) => {
  await authorizeCustomer(page);
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contato");
  await page.getByRole("button", { name: "Abrir menu da cliente" }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  const email = page.getByRole("textbox", { name: "E-mail", exact: true });
  await email.focus();
  expect(await email.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  expect((await noOverflow(page)).scale).toBe(1);
  expect((await noOverflow(page)).horizontal).toBeLessThanOrEqual(1);
});
